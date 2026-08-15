import "./landing.css";

export default function Home() {
  return (
    <div className="landing-page">
      <header>
        <nav className="wrap">
          <div className="logo">on<span>base</span></div>
          <div className="navlinks">
            <a href="#about">About</a>
            <a href="#services">Services</a>
            <a href="#scope">Scope</a>
            <a href="#contact">Contact</a>
          </div>
          <a href="#login" className="btn btn-primary">Client Login</a>
        </nav>
      </header>

      <section className="hero wrap" style={{ borderTop: "none" }}>
        <div>
          <div className="eyebrow">Operations, automated</div>
          <h1>
            Your business runs itself between the moments <em>you</em> show up.
          </h1>
          <p>
            A client portal for the automations and tools built specifically
            for your operations — activate what you need, adjust it to sound
            like you, and switch it off just as easily.
          </p>
          <div className="hero-ctas">
            <a href="#services" className="btn btn-primary">View services</a>
            <a href="#contact" className="btn btn-ghost">Get in touch</a>
          </div>
        </div>

        <div className="inbox-card">
          <div className="inbox-head">
            <span className="mono">inbox · hello@yourbusiness.com</span>
            <div className="dot-row">
              <div className="dot"></div>
              <div className="dot"></div>
              <div className="dot"></div>
            </div>
          </div>
          <div className="msg">
            <div className="from">R. Delgado</div>
            <div className="snippet">Hi, I wanted to ask about pricing for the...</div>
          </div>
          <div className="reply">
            <div className="from">Auto-acknowledged</div>
            <div className="snippet">
              Thanks for reaching out — we&apos;ve received your message and
              will get back to you shortly.
            </div>
            <span className="tag mono">sent in 0.4s</span>
          </div>
        </div>
      </section>

      <section id="about">
        <div className="wrap about-grid">
          <div>
            <div className="eyebrow">About</div>
            <h2>One person, built to feel like a team.</h2>
            <p>
              Onbase is run independently — every automation in the catalog
              is built, tested, and supported by one person. No account
              managers, no hand-offs. What scales instead is the work
              itself: tools built once, refined with feedback, and handed to
              each client ready to run.
            </p>
            <p>
              The portal exists so that growing the client list doesn&apos;t
              mean growing the overhead. You get direct access to the person
              who built the tool, and full control over how it behaves in
              your business.
            </p>
          </div>
          <div className="about-side">
            <span className="mono">How it&apos;s structured</span>
            <div className="stat-row">
              <span className="label">Built and maintained by</span>
              <span className="val">1 person</span>
            </div>
            <div className="stat-row">
              <span className="label">Client control</span>
              <span className="val">Full — edit or remove anytime</span>
            </div>
            <div className="stat-row">
              <span className="label">Current integration</span>
              <span className="val">Google Workspace</span>
            </div>
            <div className="stat-row">
              <span className="label">Support</span>
              <span className="val">Direct, no tickets</span>
            </div>
          </div>
        </div>
      </section>

      <section id="services">
        <div className="wrap">
          <div className="section-head">
            <div className="eyebrow">Services</div>
            <h2>Pick what your business needs.</h2>
            <p>
              Every tool here started as something built for a real client.
              Once it&apos;s reliable, it gets added to the catalog for
              everyone.
            </p>
          </div>
          <div className="service-grid">
            <div className="service-card">
              <span className="status live">Live</span>
              <h3>Email First-Response</h3>
              <p>
                Acknowledges new emails the moment they land, using a
                message you write and can edit anytime before it goes live.
              </p>
              <span className="cat mono">CATEGORY · INBOX</span>
            </div>
            <div className="service-card">
              <span className="status wip">In development</span>
              <h3>Lead Intake Sorter</h3>
              <p>
                Reads incoming inquiries and routes them by type, so
                nothing sits unsorted in a shared inbox.
              </p>
              <span className="cat mono">CATEGORY · INBOX</span>
            </div>
            <div className="service-card">
              <span className="status wip">In development</span>
              <h3>Follow-Up Scheduler</h3>
              <p>
                Queues a follow-up automatically when a thread goes quiet
                for a set number of days.
              </p>
              <span className="cat mono">CATEGORY · SCHEDULING</span>
            </div>
          </div>
        </div>
      </section>

      <section id="scope">
        <div className="wrap">
          <div className="section-head">
            <div className="eyebrow">Scope</div>
            <h2>How working together looks.</h2>
          </div>
          <div className="scope-list">
            <div className="scope-item">
              <span className="scope-num">01</span>
              <div>
                <h3>We talk about your business</h3>
                <p>
                  A short conversation about what&apos;s repetitive or slow
                  in your day-to-day — that&apos;s where the right
                  automation comes from.
                </p>
              </div>
            </div>
            <div className="scope-item">
              <span className="scope-num">02</span>
              <div>
                <h3>You get portal access</h3>
                <p>
                  Log in, browse what&apos;s available, and activate the
                  ones that fit. Each one shows exactly what it does before
                  you turn it on.
                </p>
              </div>
            </div>
            <div className="scope-item">
              <span className="scope-num">03</span>
              <div>
                <h3>You stay in control</h3>
                <p>
                  Edit the wording, pause it, or remove it entirely —
                  anytime, without needing to ask.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="contact">
        <div className="wrap">
          <div className="contact-band">
            <h2>Let&apos;s see what can run on its own.</h2>
            <p>
              Reach out and we&apos;ll figure out which automation gets you
              the most time back first.
            </p>
            <a href="mailto:hello@onbase.co" className="btn btn-primary">
              hello@onbase.co
            </a>
          </div>
        </div>
      </section>

      <footer>
        <div className="wrap">
          <span className="mono">onbase</span>
          <span className="mono">© 2026 · built independently</span>
        </div>
      </footer>
    </div>
  );
}
