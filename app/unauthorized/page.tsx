export default function UnauthorizedPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-black text-white p-8">
      <div className="max-w-md text-center">
        <h1 className="text-3xl font-bold mb-4">Access Restricted</h1>
        <p className="text-lg mb-6">
          Only internal team members with a <strong>@rougevc.com</strong>,{" "}
          <strong>@rlsclub.com</strong>, or <strong>.rouge@gmail.com</strong>{" "}
          email can access this dashboard.
        </p>
        <p className="text-sm text-gray-400">
          Please sign in with a valid company email or contact the admin for
          access.
        </p>
      </div>
    </div>
  );
}
