import Link from 'next/link'
export default function Home() {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">Todo Platform</h1>
      <p className="mt-4">Hemen başlamak için giriş yap veya hesap oluştur.</p>
      <div className="mt-4">
        <Link href="/auth/login"><a className="mr-4">Giriş</a></Link>
        <Link href="/auth/register"><a>Kayıt</a></Link>
      </div>
    </main>
  )
}
