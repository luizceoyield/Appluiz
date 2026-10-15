import logo from '../assets/logo-sicoob-centro.png';

export default function Configuracao({ motivo }: { motivo: 'config' | 'sem-acesso' }) {
  if (motivo === 'sem-acesso') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-nevoa-50 p-4">
        <div className="card max-w-xl p-8">
          <img src={logo} alt="Sicoob Centro" className="h-12 w-auto" />
          <h1 className="mt-6 text-xl font-bold text-sicoob-escuro">Não foi possível abrir os dados da frota</h1>
          <p className="mt-3 text-sm text-nevoa-700">
            Entre na sua conta do claude.ai e abra esta página pelo link compartilhado. Se continuar aparecendo,
            peça ao responsável pela frota para liberar seu acesso.
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className="flex min-h-screen items-center justify-center bg-nevoa-50 p-4">
      <div className="card max-w-xl p-8">
        <img src={logo} alt="Sicoob Centro" className="h-12 w-auto" />
        <h1 className="mt-6 text-xl font-bold text-sicoob-escuro">Conecte o banco de dados</h1>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-nevoa-700">
          <li>Crie um projeto em <strong>supabase.com</strong>.</li>
          <li>No <strong>SQL Editor</strong>, execute os arquivos de <code className="rounded bg-nevoa-100 px-1">supabase/migrations/</code> em ordem.</li>
          <li>
            Defina as variáveis <code className="rounded bg-nevoa-100 px-1">VITE_SUPABASE_URL</code> e{' '}
            <code className="rounded bg-nevoa-100 px-1">VITE_SUPABASE_ANON_KEY</code> (arquivo <code>.env</code>, veja <code>.env.example</code>).
          </li>
          <li>Reinicie o app.</li>
        </ol>
      </div>
    </div>
  );
}
