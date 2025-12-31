import { Key, CheckCircle, XCircle } from 'lucide-react';

export default function LicenseManagement() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Gerenciar Licenças</h1>

      <div className="card mb-6 bg-green-50 border-green-200">
        <div className="flex items-center gap-3">
          <CheckCircle className="w-10 h-10 text-green-600" />
          <div>
            <h3 className="text-lg font-bold">Licença Ativa</h3>
            <p className="text-sm text-gray-600">Seu sistema está ativo e funcionando normalmente.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <Key className="w-8 h-8 text-primary-600 mb-4" />
          <h3 className="text-xl font-bold mb-2">Ativar Nova Licença</h3>
          <p className="text-sm text-gray-600 mb-4">Digite a chave da licença para ativar novos recursos.</p>
          
          <input
            type="text"
            className="input mb-4"
            placeholder="XXXX-XXXX-XXXX-XXXX"
          />
          <button className="btn btn-primary w-full">
            Ativar Licença
          </button>
        </div>

        <div className="card">
          <h3 className="text-xl font-bold mb-4">Informações da Licença</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Plano:</span>
              <span className="font-medium">Profissional</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Status:</span>
              <span className="text-green-600 font-medium">Ativa</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Validade:</span>
              <span className="font-medium">Ilimitada</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 card bg-blue-50 border-blue-200">
        <h3 className="text-lg font-bold mb-2">📞 Precisa de uma licença?</h3>
        <p className="text-gray-600">
          Entre em contato: <strong>wanderpsc@gmail.com</strong>
        </p>
      </div>
    </div>
  );
}
