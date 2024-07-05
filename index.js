const puppeteer = require('puppeteer');
const fs = require('fs');

async function scrapeFIDC() {
  const browser = await puppeteer.launch({ headless: false }); // Inicia o navegador
  const page = await browser.newPage();
  await page.goto('https://web.cvm.gov.br/app/fundosweb/#/consultaPublica', {
    waitUntil: 'networkidle2',
  });

  console.log('Página inicial carregada.');

  // Espera o elemento do tipo estar disponível
  await page.waitForSelector('select[name="filtroRegistroFundoBean.tipoRegistro"]');
  console.log('Selecionando tipo FIDC...');

  // Seleciona o Tipo: FIDC
  await page.select('select[name="filtroRegistroFundoBean.tipoRegistro"]', '67');

  // Espera o checkbox estar disponível
  await page.waitForSelector('input[name="situacaoRegistro-1"]');
  console.log('Marcando a situação Em Funcionamento Normal...');

  // Marca a situação de registro "Em Funcionamento Normal"
  await page.click('input[name="situacaoRegistro-1"]');

  // Espera o botão Pesquisar estar disponível
  await page.waitForSelector('a[title="Pesquisar"]');
  console.log('Clicando no botão Pesquisar...');

  // Clica no botão Pesquisar
  await page.click('a[title="Pesquisar"]');
  await page.waitForSelector('table tbody', { timeout: 60000 });
  console.log('Tabela de resultados carregada.');

  // Função para extrair o texto dos campos desejados
  const extractDetails = async () => {
    return await page.evaluate(() => {
      const getElementText = (selector) => {
        const element = document.querySelector(selector);
        return element ? element.innerText.trim() : 'N/A';
      };

      const getEmails = () => {
        const emailElements = document.querySelectorAll('p.form-control-static[title="E-mail(s)"]');
        return emailElements.length > 0 ? Array.from(emailElements).map(el => el.innerText.trim()) : ['N/A'];
      };

      const getPhones = () => {
        const phoneElements = document.querySelectorAll('p.form-control-static[title="Telefone(s)"], p.form-control-static[title="Fax"]');
        return phoneElements.length > 0 ? Array.from(phoneElements).map(el => el.innerText.trim()) : ['N/A'];
      };

      return {
        nome: getElementText('.col-lg-7 > p[title="Nome"]'),
        responsavel: getElementText('#txtDiretorResponsavelFundo'),
        emails: getEmails(),
        telefones: getPhones()
      };
    });
  };

  // Função para esperar um tempo
  const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  // Pega todos os botões de detalhes
  let detailButtons = await page.$$('a[title="Visualizar detalhe do Fundo"]');

  // Array para armazenar todos os detalhes
  let allDetails = [];

  if (detailButtons.length > 0) {
    console.log(`Encontrados ${detailButtons.length} botões de detalhes.`);

    for (let i = 0; i < detailButtons.length; i++) {
      console.log(`Clicando no botão de detalhes ${i + 1}...`);
      await detailButtons[i].click();
      await page.waitForSelector('li[data-target="#tabPanelVisualizarParticipante"]', { visible: true, timeout: 60000 });
      console.log('Página de detalhes carregada.');

      // Espera o botão "Participantes" estar disponível e clica nele
      console.log('Clicando na aba Participantes...');
      await page.click('li[data-target="#tabPanelVisualizarParticipante"]');

      // Tentar extrair detalhes até que todos sejam capturados corretamente
      let details = {};
      do {
        details = await extractDetails();
      } while (details.nome === 'N/A' || details.emails.includes('N/A'));

      console.log(`Nome: ${details.nome}`);
      console.log(`Responsável: ${details.responsavel}`);
      console.log(`Emails: ${details.emails.join(', ')}`);
      console.log(`Telefones: ${details.telefones.join(', ')}`);

      // Adiciona os detalhes ao array
      allDetails.push(details);

      // Clica no botão Voltar
      console.log('Clicando no botão Voltar...');
      await page.click('a[title="Voltar"]');

      // Aguarda a tabela carregar novamente
      await page.waitForSelector('table tbody', { timeout: 60000 });
      console.log('Voltando para a página de resultados...');

      // Espera 1 segundo para garantir que a tabela esteja totalmente carregada
      await wait(1000);

      // Atualiza a lista de botões de detalhes
      detailButtons = await page.$$('a[title="Visualizar detalhe do Fundo"]');
    }

    // Salva todos os detalhes em um único arquivo JSON
    const fileName = 'fundos_details.json';
    fs.writeFileSync(fileName, JSON.stringify(allDetails, null, 2));
    console.log(`Todos os detalhes salvos no arquivo ${fileName}.`);
  } else {
    console.log('Nenhum botão de detalhes encontrado.');
  }

  await browser.close();
}

scrapeFIDC();
