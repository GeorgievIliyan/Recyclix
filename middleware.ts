import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const protectedRoutes = ["/dashboard", "/api/private"]

export async function middleware(req: NextRequest){
    const res = NextResponse.next()

    const supabaseAccessToken = req.cookies.get("sb-access-token")?.value

    if (protectedRoutes.some(path => req.nextUrl.pathname.startsWith(path))){
        if (!supabaseAccessToken){
            return NextResponse.redirect(new URL("/login", req.url))
        }
    }

    return res
}

export const config = {
    matcher: ["/dashboard/:path", "/api/private/:path*"]
}