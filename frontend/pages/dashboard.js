import { useEffect, useState } from 'react';
export default function Dashboard(){
  const [projects, setProjects] = useState([]);
  useEffect(()=>{
    const token = localStorage.getItem('accessToken');
    if (!token) { window.location.href = '/auth/login'; return; }
    fetch(process.env.NEXT_PUBLIC_API_URL + '/projects', { headers: { Authorization: 'Bearer ' + token }, credentials: 'include' })
      .then(r=>r.json()).then(d=>setProjects(d)).catch(console.error);
  },[])
  return (
    <div className="p-8">
      <h1>Dashboard</h1>
      <ul>{projects.map(p=> <li key={p.id}>{p.title}</li>)}</ul>
    </div>
  )
}
