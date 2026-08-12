import logo from "../assets/logo.png";

export default function LoadingScreen() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 px-6">
      <img src={logo} alt="" className="w-56 max-w-[70%]" />
      <span className="loading loading-dots loading-lg" />
    </main>
  );
}
