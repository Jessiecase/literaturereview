export async function GET(request: Request) { return Response.redirect(new URL('/review.html', request.url), 302); }
