import { Link } from "react-router-dom"
import { FileText, Scale, ShieldCheck } from "lucide-react"
import { PageHeader } from "../components/ui/PageHeader"

/**
 * Draft terms of service.
 *
 * The clauses describe the behaviour of this codebase but governing law,
 * entity details and formal notice addresses are placeholders. Have counsel
 * review before launch.
 */
export default function TermsOfServicePage() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow="Legal"
        title="Terms of Service"
        subtitle="The rules for using Npop as a listener, artist or administrator."
      />

      <div className="mb-6 rounded-2xl border border-brand-primary/30 bg-brand-primary/10 p-4 text-sm leading-6 text-app-text">
        <p className="font-semibold">Draft for review</p>
        <p className="mt-1 text-app-muted">
          These terms are a good-faith draft that reflects how Npop currently
          works. Placeholders in square brackets must be completed, and the final
          text should be reviewed by a qualified lawyer. It is not legal advice.
        </p>
      </div>

      <nav aria-label="Contents" className="surface-card mb-8 p-5">
        <p className="text-sm font-semibold text-app-text">Contents</p>
        <ol className="mt-2 grid gap-1 text-sm text-app-muted sm:grid-cols-2">
          {[
            ["#agreement", "1. Agreement"],
            ["#eligibility", "2. Eligibility"],
            ["#accounts", "3. Accounts"],
            ["#acceptable-use", "4. Acceptable use"],
            ["#your-content", "5. Your content"],
            ["#artist-content", "6. Artist uploads"],
            ["#copyright", "7. Copyright complaints"],
            ["#moderation", "8. Moderation"],
            ["#platform-ip", "9. Npop intellectual property"],
            ["#third-party", "10. Third-party links"],
            ["#termination", "11. Termination"],
            ["#disclaimers", "12. Disclaimers"],
            ["#liability", "13. Liability"],
            ["#indemnity", "14. Indemnity"],
            ["#law", "15. Governing law"],
            ["#changes", "16. Changes"],
            ["#contact", "17. Contact"],
          ].map(([href, label]) => (
            <li key={href}>
              <a href={href} className="hover:text-brand-primary hover:underline">
                {label}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <article className="prose-legal">
        <p>
          <strong className="text-app-text">Effective date:</strong> [EFFECTIVE
          DATE]
          <br />
          <strong className="text-app-text">Last updated:</strong> [LAST UPDATED
          DATE]
        </p>

        <h2 id="agreement">1. Agreement</h2>
        <p>
          These Terms of Service (&ldquo;Terms&rdquo;) form a binding agreement
          between you and [COMPANY LEGAL NAME] (&ldquo;Npop&rdquo;,
          &ldquo;we&rdquo;, &ldquo;us&rdquo;) governing your use of the Npop
          website, API and related services (the &ldquo;Service&rdquo;). By
          creating an account, accessing or using the Service, you agree to these
          Terms and to our <Link to="/privacy-policy">Privacy Policy</Link>. If
          you do not agree, do not use the Service.
        </p>

        <h2 id="eligibility">2. Eligibility</h2>
        <p>
          You must be old enough to form a binding contract in your jurisdiction
          and at least the minimum age required by our Privacy Policy. If you use
          the Service on behalf of an organization, you represent that you have
          authority to bind it to these Terms.
        </p>

        <h2 id="accounts">3. Accounts</h2>
        <ul>
          <li>Provide accurate account information and keep it up to date.</li>
          <li>Keep your password confidential and do not share your account.</li>
          <li>
            You are responsible for activity that occurs under your account,
            except where caused by our failure to use reasonable security.
          </li>
          <li>
            Self-registration creates a listener account. Artist profiles and
            administrator roles are separate capabilities; verification is granted
            only by administrators and cannot be self-assigned.
          </li>
          <li>
            Notify us at [SECURITY CONTACT EMAIL] if you suspect unauthorized
            access.
          </li>
        </ul>

        <h2 id="acceptable-use">4. Acceptable use</h2>
        <p>You agree not to:</p>
        <ul>
          <li>Break the law, infringe intellectual property or violate privacy rights.</li>
          <li>
            Upload or share malware, phishing content, spam, or content that
            sexualizes minors, incites violence or harasses others.
          </li>
          <li>
            Impersonate another person or artist, or misrepresent your affiliation
            with an artist or rights holder.
          </li>
          <li>
            Attempt to access accounts, data or systems you are not authorized to
            access, or probe, scan or bypass security controls.
          </li>
          <li>
            Use automated means to scrape, overload or disrupt the Service, or
            evade rate limits and other protections.
          </li>
          <li>
            Upload audio or artwork you do not own or have permission to
            distribute.
          </li>
          <li>
            Use the Service to build a competing database of content obtained
            through unauthorized scraping.
          </li>
        </ul>

        <h2 id="your-content">5. Your content</h2>
        <p>
          You retain ownership of the content you create, such as posts, comments,
          playlists, profile information and media (&ldquo;Your Content&rdquo;).
          You grant Npop a non-exclusive, worldwide, royalty-free licence to host,
          store, reproduce, display, transmit and adapt Your Content as needed to
          operate, provide and promote the Service. This licence ends when you
          delete Your Content or your account, except for copies retained in
          backups, shared content others have reposted, or content we must keep
          for legal reasons.
        </p>
        <p>
          You are responsible for Your Content and for ensuring you have the
          rights needed to share it. Do not post content that is unlawful,
          misleading, hateful or infringing.
        </p>

        <h2 id="artist-content">6. Artist uploads</h2>
        <p>
          If you publish music as an artist, you represent and warrant that you
          own or control all rights in the audio, artwork and metadata you upload,
          including any samples, featured performances and cover versions, and
          that distribution through Npop does not infringe anyone&rsquo;s rights.
        </p>
        <p>
          You grant Npop the licence described above for your releases, and you
          authorize us to make them available to listeners through the Service.
          You are responsible for any royalties or payments owed to collaborators,
          labels, publishers or collecting societies. Npop does not currently
          operate a payment or royalty distribution system, and nothing in these
          Terms creates an entitlement to payment.
        </p>

        <h2 id="copyright">7. Copyright complaints</h2>
        <p>
          If you believe content on Npop infringes your copyright, send a notice
          to [COPYRIGHT AGENT EMAIL] including your contact details, a description
          of the work and the allegedly infringing material, a statement of good
          faith, and a statement that the information is accurate and that you are
          authorized to act. We may remove or disable access to material and
          notify the uploader. Repeated infringement may result in account
          termination. Counter-notices can be sent to the same address.
        </p>

        <h2 id="moderation">8. Moderation</h2>
        <p>
          We may review, remove, restrict or label content, verify or unverify
          artists, change account roles and suspend or terminate accounts where we
          reasonably believe these Terms or applicable law have been violated, or
          to protect users and the Service. Moderation decisions are made at our
          discretion, and we are not obliged to host any particular content.
        </p>

        <h2 id="platform-ip">9. Npop intellectual property</h2>
        <p>
          The Service, including its software, design, branding and documentation,
          is owned by Npop or its licensors and protected by intellectual property
          laws. These Terms do not grant you any right to use Npop trademarks,
          logos or branding without prior written permission.
        </p>

        <h2 id="third-party">10. Third-party links and services</h2>
        <p>
          The Service may contain links to third-party sites, media hosts or
          services. We do not control and are not responsible for their content,
          policies or practices. Your use of a third-party service is governed by
          that provider&rsquo;s terms.
        </p>

        <h2 id="termination">11. Termination</h2>
        <p>
          You may stop using the Service at any time and can delete your account
          from Settings. We may suspend or terminate your access if you materially
          breach these Terms, if required by law, or if continuing to provide the
          Service would create risk for Npop or others. Provisions that by their
          nature should survive termination, including content licences for
          content already shared, disclaimers and liability limits, will survive.
        </p>

        <h2 id="disclaimers">12. Disclaimers</h2>
        <p>
          The Service is provided &ldquo;as is&rdquo; and &ldquo;as
          available&rdquo;. To the maximum extent permitted by law, Npop disclaims
          all warranties, express or implied, including merchantability, fitness
          for a particular purpose, non-infringement and uninterrupted or
          error-free operation. We do not warrant that content is accurate, that
          artists own the rights they claim, or that the Service will be available
          at any particular time.
        </p>

        <h2 id="liability">13. Limitation of liability</h2>
        <p>
          To the maximum extent permitted by law, Npop and its operators,
          employees and suppliers will not be liable for indirect, incidental,
          special, consequential or punitive damages, or for loss of profits,
          revenue, data, goodwill or business opportunity, arising from or related
          to the Service. Where liability cannot be excluded, our aggregate
          liability is limited to [LIABILITY CAP OR JURISDICTION-SPECIFIC
          LANGUAGE]. Nothing in these Terms limits liability that cannot be
          limited by law.
        </p>

        <h2 id="indemnity">14. Indemnity</h2>
        <p>
          You agree to indemnify and hold harmless Npop and its operators from
          claims, damages, liabilities and expenses (including reasonable legal
          fees) arising from your content, your use of the Service, or your breach
          of these Terms, except to the extent caused by our own negligence or
          wilful misconduct.
        </p>

        <h2 id="law">15. Governing law and disputes</h2>
        <p>
          These Terms are governed by the laws of [GOVERNING JURISDICTION],
          without regard to conflict-of-law rules. Disputes will be resolved in
          the courts of [VENUE], unless mandatory law in your country of residence
          gives you a different forum. Before filing a claim, please contact us at
          [LEGAL CONTACT EMAIL] so we can try to resolve the issue informally.
        </p>

        <h2 id="changes">16. Changes to these Terms</h2>
        <p>
          We may update these Terms from time to time. We will post the revised
          version on this page and update the &ldquo;Last updated&rdquo; date.
          Material changes will be notified in the application or by email where
          appropriate. Continued use after the effective date means you accept the
          revised Terms.
        </p>

        <h2 id="contact">17. Contact</h2>
        <p>
          Questions about these Terms can be sent to [LEGAL CONTACT EMAIL] or by
          post to [COMPANY LEGAL NAME], [REGISTERED ADDRESS]. See also our{" "}
          <Link to="/privacy-policy">Privacy Policy</Link>.
        </p>
      </article>

      <div className="mt-10 flex flex-wrap items-center gap-4 rounded-2xl border border-app-border bg-app-surface p-4 text-sm text-app-muted">
        <span className="inline-flex items-center gap-2">
          <ShieldCheck size={15} className="text-brand-success" /> Server-side authorization on every mutation
        </span>
        <span className="inline-flex items-center gap-2">
          <Scale size={15} className="text-brand-primary" /> [GOVERNING JURISDICTION]
        </span>
        <Link
          to="/privacy-policy"
          className="ml-auto inline-flex items-center gap-1.5 font-semibold text-brand-primary hover:underline"
        >
          <FileText size={15} /> Privacy Policy
        </Link>
      </div>
    </div>
  )
}
