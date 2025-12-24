export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#0f0a15] text-white p-8 max-w-4xl mx-auto">
      <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>

      <div className="space-y-6">
        <section>
          <h2 className="text-2xl font-semibold mb-4">Acceptance of Terms</h2>
          <p className="text-gray-300">
            By accessing and using OSHO, you accept and agree to be bound by these terms.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">User Accounts</h2>
          <p className="text-gray-300">
            You are responsible for maintaining the security of your account and for all
            activities that occur under your account.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Content</h2>
          <p className="text-gray-300">
            You retain ownership of content you create. By posting content, you grant us
            a license to display and distribute your content on our platform.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Prohibited Conduct</h2>
          <p className="text-gray-300">
            Users must not violate laws, infringe rights, or engage in harmful behavior
            on the platform.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Termination</h2>
          <p className="text-gray-300">
            We reserve the right to terminate or suspend accounts that violate these terms.
          </p>
        </section>
      </div>

      <p className="text-gray-500 mt-12 text-sm">Last updated: December 21, 2025</p>
    </div>
  );
}
