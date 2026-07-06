import InfoPage from "@/components/InfoPage";

export const metadata = { title: "Data deletion — LuxuryBandit" };

// Required by Meta (Facebook Login): a public "Data Deletion Instructions URL".
// Plain instructions page — deletion itself is handled manually via support.
export default function DataDeletionPage() {
  return (
    <InfoPage title="Data deletion">
      <p>
        You can request the deletion of your LuxuryBandit account and all data associated with
        it (profile, photos, try-ons, messages) at any time.
      </p>

      <h2>How to delete your data</h2>
      <p>
        Send an email to{" "}
        <a href="mailto:support@luxurybandit.com?subject=Delete%20my%20data">support@luxurybandit.com</a>{" "}
        with the subject <strong>&ldquo;Delete my data&rdquo;</strong> from the email address you
        signed up with (or include the email/Facebook account you used to sign in).
      </p>
      <p>
        We will delete your account and all associated personal data within <strong>30 days</strong>{" "}
        and confirm the deletion by email. Generated content that was published publicly is removed
        together with your account.
      </p>

      <h2>Facebook Login</h2>
      <p>
        If you signed in with Facebook, removing the LuxuryBandit app in your Facebook settings
        (Settings &rarr; Apps and Websites) stops any further data access. To also delete the data
        we already hold, send the deletion request described above.
      </p>
    </InfoPage>
  );
}
