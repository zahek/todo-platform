import { useState } from 'react';
import Router from 'next/router'

export default function Login(){
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  async function submit(e){
    e.preventDefault();
    const res = await fetch(process.env.NEXT_PUBLIC_API_URL + '/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (res.ok && data.accessToken) {
      // store access token in memory (or localStorage) — demo purposes
      localStorage.setItem('accessToken', data.accessToken);
      Router.push('/dashboard');
    } else alert(data.error || 'Login failed');
  }

  return (
    <form onSubmit={submit} className="p-8">
      <h2 className="text-xl">Giriş</h2>
      <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="email" />
      <input value={password} onChange={e=>setPassword(e.target.value)} placeholder="password" type="password" />
      <button type="submit">Giriş</button>
    </form>
  )
}
