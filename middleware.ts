import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Altere para true quando quiser liberar novamente o formulário de inscrição.
const INSCRICOES_ABERTAS = false;

export async function middleware(request: NextRequest) {
  if (!INSCRICOES_ABERTAS && request.nextUrl.pathname === "/inscricao") {
    return NextResponse.redirect(
      new URL("/inscricoes-encerradas", request.url),
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/inscricao"],
};
