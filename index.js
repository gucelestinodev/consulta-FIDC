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

  // Espera a primeira lupa estar disponível
  const detailButtons = await page.$$('a[title="Visualizar detalhe do Fundo"]');
  if (detailButtons.length > 0) {
    console.log('Clicando na primeira lupa...');
    await detailButtons[0].click();
    await page.waitForSelector('li[data-target="#tabPanelVisualizarParticipante"]', { visible: true, timeout: 60000 });
    console.log('Página de detalhes carregada.');

    // Espera o botão "Participantes" estar disponível e clica nele
    console.log('Clicando na aba Participantes...');
    await page.click('li[data-target="#tabPanelVisualizarParticipante"]');

    // Extrai o nome e email do responsável
    const details = await page.evaluate(() => {
      const nomeElement = Array.from(document.querySelectorAll('label')).find(el => el.innerText.includes('Nome:')).nextElementSibling.querySelector('p.form-control-static');
      const emailElements = Array.from(document.querySelectorAll('p.form-control-static.ng-binding.ng-scope')).filter(el => el.title === 'E-mail(s)');
      const nome = nomeElement ? nomeElement.innerText : 'N/A';
      const emails = emailElements.length > 0 ? emailElements.map(el => el.innerText) : ['N/A'];
      return { nome, emails };
    });

    console.log(`Responsável: ${details.nome}`);
    console.log(`Emails: ${details.emails.join(', ')}`);

    // Salva os detalhes em um arquivo
    fs.writeFileSync('fundos_details.json', JSON.stringify(details, null, 2));

    // Clica no botão Voltar
    console.log('Clicando no botão Voltar...');
    await page.click('a[title="Voltar"]');
    await page.waitForSelector('table tbody', { timeout: 60000 });
    console.log('Voltando para a página de resultados...');
  } else {
    console.log('Nenhum botão de detalhes encontrado.');
  }

  await browser.close();
}

scrapeFIDC();
