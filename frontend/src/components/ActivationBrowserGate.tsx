import { Chrome, ExternalLink, ShieldAlert } from 'lucide-react';

export default function ActivationBrowserGate() {
  const isAndroid = /Android/i.test(navigator.userAgent);
  const currentUrl = window.location.href;
  const chromeIntent = `intent://navigate?url=${encodeURIComponent(currentUrl)}#Intent;scheme=googlechrome;package=com.android.chrome;end`;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center">
        <ShieldAlert className="w-14 h-14 text-amber-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-800 mb-2">Abra no navegador do celular</h2>
        <p className="text-gray-600 text-sm mb-5">
          O navegador interno deste aplicativo não pode instalar o ponto com segurança.
          A ativação ainda não foi utilizada.
        </p>

        {isAndroid ? (
          <>
            <a
              href={chromeIntent}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2"
            >
              <Chrome className="w-5 h-5" />
              Abrir e instalar no Chrome
            </a>
            <p className="text-xs text-gray-500 mt-4">
              Se o botão não abrir, use o menu acima e escolha “Abrir no Chrome” ou “Abrir no navegador”.
            </p>
          </>
        ) : (
          <div className="bg-blue-50 text-blue-900 rounded-xl p-4 text-sm text-left">
            <p className="font-semibold flex items-center gap-2 mb-2">
              <ExternalLink className="w-4 h-4" />
              No iPhone
            </p>
            <p>Use o menu desta tela e escolha “Abrir no Safari”. Depois, toque em “Instalar aplicativo”.</p>
          </div>
        )}

        <p className="text-xs font-semibold text-red-600 mt-5">
          Não compartilhe nem copie este link para outro aparelho.
        </p>
      </div>
    </div>
  );
}
