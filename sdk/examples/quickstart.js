const JuegaMenteSDK = require('../src/index');

async function main() {
  const sdk = new JuegaMenteSDK({ baseUrl: 'http://localhost:5000' });

  console.log('1. Consultando materias disponibles...');
  try {
    const categories = await sdk.categories.getAll();
    console.log('Materias encontradas: ' + categories.length);
    
    if (categories.length > 0) {
      console.log('Materia de muestra:', categories[0].name);
      const questions = await sdk.questions.getByCategory(categories[0]._id);
      console.log('Preguntas en la materia: ' + questions.length);
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}

main();
