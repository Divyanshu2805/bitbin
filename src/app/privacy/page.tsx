import type { Metadata } from "next";
import { LegalPage } from "@/components/shared/legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "What BitBin collects, why, who it is shared with and how to delete it.",
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="6 October 2026">
      <p>
        BitBin is a personal store for developer knowledge, built and run by one person as a portfolio project.
        This page says what it collects, why, who handles it and how to get rid of it.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>Account details:</strong> your email address and name, a bcrypt hash of your password (never the
          password itself), or your GitHub profile name, email and avatar if you sign in with GitHub.
        </li>
        <li>
          <strong>Your content:</strong> the snippets, prompts, commands, notes, links, files, images, tags and
          collections you save. It is yours; it is only shown to you.
        </li>
        <li>
          <strong>Billing:</strong> if you subscribe to Pro, Stripe holds your payment details and sends us a customer
          and subscription ID and your plan status. We never see or store card numbers.
        </li>
        <li>
          <strong>Technical data:</strong> your IP address, used for rate limiting and abuse prevention, and error
          reports with cookies, tokens and personal data stripped out.
        </li>
        <li>
          <strong>Cookies:</strong> one session cookie that keeps you signed in, and a theme preference. We use no
          advertising or tracking cookies.
        </li>
      </ul>

      <h2>How it is used</h2>
      <p>
        To run the service: sign you in, store and search your items, send verification and password-reset emails, take
        payment and keep the app secure. We do not sell your data and do not use your content to train models.
      </p>

      <h2>Who handles it</h2>
      <p>These providers process data on our behalf, each only for its own job:</p>
      <ul>
        <li>Vercel: hosting, and privacy-friendly page-view analytics.</li>
        <li>Neon: the PostgreSQL database that stores your account and items.</li>
        <li>Cloudflare R2: private storage for uploaded files and images.</li>
        <li>Stripe: payments (Pro plan).</li>
        <li>Resend: verification and password-reset emails.</li>
        <li>Upstash: rate-limit counters, keyed by IP address or user ID.</li>
        <li>Sentry: error monitoring, with personal data removed.</li>
        <li>GitHub: sign-in, if you choose it.</li>
        <li>
          An AI provider (OpenAI or a compatible one): only when you use an AI feature (Pro). The text of the item you
          ask about is sent to it to produce tags, a description, an explanation or a rewritten prompt.
        </li>
      </ul>

      <h2>Where your files live</h2>
      <p>
        Files are in a private bucket. They are served only to you, through the app, after checking that you own them.
      </p>

      <h2>Keeping and deleting your data</h2>
      <ul>
        <li>
          <strong>Export:</strong> Pro accounts can download everything as a ZIP from Settings.
        </li>
        <li>
          <strong>Delete:</strong> Settings → Delete account removes your account, items, collections, tags and uploaded
          files, and cancels any subscription. Backups held by our database provider expire on their normal schedule.
        </li>
        <li>
          Reset tokens and verification tokens are stored only as hashes and expire.
        </li>
      </ul>

      <h2>The demo account</h2>
      <p>
        <code>demo@bitbin.dev</code> is a shared public sandbox whose password is published. Anything saved there is
        visible to everyone who uses it and is reset daily. Do not put anything private in it.
      </p>

      <h2>Your rights</h2>
      <p>
        You can access, correct, export or delete your data from the app. If you are in the EU, UK or a similar region
        you also have rights to object to or restrict processing; open an issue on the{" "}
        <a href="https://github.com/Divyanshu2805/bitbin/issues">project repository</a> and it will be handled.
      </p>

      <h2>Children</h2>
      <p>BitBin is not meant for anyone under 16.</p>

      <h2>Changes</h2>
      <p>If this policy changes in a way that matters, the date above changes and the app will say so.</p>
    </LegalPage>
  );
}
