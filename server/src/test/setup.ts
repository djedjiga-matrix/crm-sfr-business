// Setup pour les tests Jest

// Mock de console.log en mode test pour éviter le bruit
beforeAll(() => {
    jest.spyOn(console, 'log').mockImplementation(() => { });
    jest.spyOn(console, 'error').mockImplementation(() => { });
});

afterAll(() => {
    jest.restoreAllMocks();
});
