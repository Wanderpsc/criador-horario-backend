# 🔍 TESTE DE AUTENTICAÇÃO

## Para verificar se o role está correto:

1. **Faça login** com escola@ceti.com / Ceti@2026

2. **Abra o Console do Desenvolvedor** (F12)

3. **Cole este código** no Console:

```javascript
fetch('https://criador-horario-backend-1.onrender.com/api/auth/me', {
  headers: {
    'Authorization': 'Bearer ' + localStorage.getItem('auth-token')
  }
})
.then(r => r.json())
.then(data => {
  console.log('🔍 DADOS DO USUÁRIO:', data);
  console.log('✅ Role:', data.user?.role);
  console.log('✅ Email:', data.user?.email);
  console.log('✅ Name:', data.user?.name);
  
  if (data.user?.role === 'school') {
    console.log('✅ ROLE CORRETO: school - Você PODE criar usuários!');
  } else {
    console.log('❌ ROLE INCORRETO:', data.user?.role, '- Deveria ser "school"');
  }
})
.catch(err => console.error('❌ Erro:', err));
```

4. **Veja o resultado** no console

## O que você deve ver:

```
✅ Role: "school"
✅ Email: "escola@ceti.com"
✅ Name: "CETI Desembargador Amaral"
✅ ROLE CORRETO: school - Você PODE criar usuários!
```

## Se aparecer role diferente de "school":

1. **Faça LOGOUT** completo
2. **Limpe o cache** (Ctrl + Shift + Delete)
3. **Faça LOGIN novamente**
4. **Teste novamente**

---

**Aguarde 2-3 minutos** para o Render terminar o deploy automático antes de testar!
