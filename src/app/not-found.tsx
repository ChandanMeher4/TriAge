import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="mb-4 text-6xl font-black text-gradient-violet">404</h1>
        <p className="mb-6 text-xl text-muted-foreground">
          Oops! Page not found
        </p>
        <Link href="/" className="skeuo-btn text-white font-semibold px-6 py-3 rounded-xl inline-block">
          Return to Home
        </Link>
      </div>
    </div>
  );
}
