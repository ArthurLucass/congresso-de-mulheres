import Link from "next/link";

export default function InscricoesEncerradasPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl rounded-2xl bg-white p-6 shadow-xl sm:p-10">
        <h1 className="mb-4 text-center text-2xl font-bold text-gray-800 sm:text-3xl">
          Inscrições Encerradas
        </h1>

        <p className="mb-3 text-center text-gray-700">
          Agradecemos muito o seu interesse no Congresso de Mulheres.
        </p>

        <p className="mb-8 text-center text-gray-700">
          Neste momento, atingimos o limite de inscrições. Quando novas vagas
          forem liberadas, esta página será atualizada.
        </p>

        <div className="flex justify-center">
          <Link
            href="/"
            className="rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
          >
            Voltar para o início
          </Link>
        </div>
      </div>
    </main>
  );
}
