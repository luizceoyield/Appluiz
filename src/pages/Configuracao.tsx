export default function Configuracao() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="card max-w-xl p-8">
        <img src="/logo-sicoob-centro.png" alt="Sicoob Centro" className="h-12 w-auto" />
        <h1 className="mt-6 text-xl font-bold text-sicoob-escuro">Conecte o banco de dados</h1>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-slate-700">
          <li>Crie um projeto em <strong>supabase.com</strong>.</li>
          <li>No <strong>SQL Editor</strong>, execute o arquivo <code className="rounded bg-slate-100 px-1">supabase/migrations/20261015000000_gestao_frota.sql</code>.</li>
          <li>
            Defina as variáveis <code className="rounded bg-slate-100 px-1">VITE_SUPABASE_URL</code> e{' '}
            <code className="rounded bg-slate-100 px-1">VITE_SUPABASE_ANON_KEY</code> (arquivo <code>.env</code>, veja <code>.env.example</code>).
          </li>
          <li>Reinicie o app.</li>
        </ol>
      </div>
    </div>
  );
}
