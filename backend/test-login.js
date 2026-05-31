async function test() {
  // 1. Signup
  console.log('Testing signup...');
  let res = await fetch('http://localhost:3001/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'testlogin@example.com',
      password: 'password123',
      name: 'Test User',
      phone: '1234567890',
      role: 'buyer',
      district: 'test',
      state: 'test'
    })
  });
  
  if (res.status === 400) {
    console.log('User already exists, skipping signup');
  } else if (!res.ok) {
    console.error('Signup failed:', await res.text());
    return;
  } else {
    console.log('Signup success:', await res.json());
  }

  // 2. Login
  console.log('\nTesting login...');
  res = await fetch('http://localhost:3001/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'testlogin@example.com',
      password: 'password123'
    })
  });

  if (!res.ok) {
    console.error('Login failed:', await res.text());
    return;
  }
  
  const data = await res.json();
  console.log('Login success, got token:', data.session.access_token.substring(0, 20) + '...');

  // 3. Me
  console.log('\nTesting me...');
  res = await fetch('http://localhost:3001/api/auth/me', {
    headers: { 'Authorization': `Bearer ${data.session.access_token}` }
  });

  if (!res.ok) {
    console.error('Me failed:', await res.text());
    return;
  }
  console.log('Me success:', await res.json());
}

test();
