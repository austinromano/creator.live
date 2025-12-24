export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#0f0a15] text-white p-8 max-w-4xl mx-auto">
      <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>

      <div className="space-y-6">
        <section>
          <h2 className="text-2xl font-semibold mb-4">Information We Collect</h2>
          <p className="text-gray-300">
            When you sign in with Google, we collect your email address and profile information
            to create and manage your account on OSHO.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">How We Use Your Information</h2>
          <p className="text-gray-300">
            We use your information to provide and improve our services, including creating
            your profile, enabling you to create content, and interact with other users.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Data Security</h2>
          <p className="text-gray-300">
            We implement appropriate security measures to protect your personal information.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Contact Us</h2>
          <p className="text-gray-300">
            If you have questions about this privacy policy, please contact us.
          </p>
        </section>
      </div>

      <p className="text-gray-500 mt-12 text-sm">Last updated: December 21, 2025</p>
    </div>
  );
}
