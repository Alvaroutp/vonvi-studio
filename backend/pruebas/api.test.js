const request = require('supertest');
const api = request('http://localhost:3000');

test('el catalogo responde con las categorias', async () => {
    const res = await api.get('/api/categorias');
    expect(res.status).toBe(200);
});

test('una categoria que no existe da 404', async () => {
    const res = await api.get('/api/categorias/estonoexiste');
    expect(res.status).toBe(404);
});

test('el login con datos malos da 401', async () => {
    const res = await api.post('/api/auth/login')
        .send({ email: 'nadie@vonvi.com', password: 'malacontrasena' });
    expect(res.status).toBe(401);
});

test('pedir el perfil sin iniciar sesion da 401', async () => {
    const res = await api.get('/api/auth/perfil');
    expect(res.status).toBe(401);
});

test('el registro sin datos da 400', async () => {
    const res = await api.post('/api/auth/registro').send({});
    expect(res.status).toBe(400);
});