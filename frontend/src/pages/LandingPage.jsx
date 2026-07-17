import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import {
  ArrowRight,
  CheckCircle,
  FileSpreadsheet,
  BarChart3,
  Zap,
  Shield,
  TrendingUp,
  Users,
  Sparkles,
  Clock,
  Download,
  Globe,
  Menu,
  X
} from 'lucide-react';
import './LandingPage.css';

const LandingPage = () => {
  const navigate = useNavigate();
  const heroRef = useRef(null);
  const featuresRef = useRef(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    // Scroll handler for header
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);

    // GSAP Animations
    const ctx = gsap.context(() => {
      gsap.from('.hero-badge', {
        y: 20,
        opacity: 0,
        duration: 0.8,
        ease: 'power3.out',
      });

      gsap.from('.hero-title', {
        y: 50,
        opacity: 0,
        duration: 1,
        delay: 0.2,
        ease: 'power3.out',
      });

      gsap.from('.hero-subtitle', {
        y: 30,
        opacity: 0,
        duration: 1,
        delay: 0.4,
        ease: 'power3.out',
      });

      gsap.from('.hero-buttons', {
        y: 30,
        opacity: 0,
        duration: 1,
        delay: 0.6,
        ease: 'power3.out',
      });

      gsap.from('.trust-badge', {
        y: 20,
        opacity: 0,
        duration: 0.8,
        delay: 0.8,
        ease: 'power3.out',
      });

      gsap.from('.feature-card', {
        y: 50,
        opacity: 0,
        duration: 0.8,
        stagger: 0.15,
        scrollTrigger: {
          trigger: '.features-section',
          start: 'top 80%',
        },
      });

      gsap.from('.benefit-item', {
        x: -30,
        opacity: 0,
        duration: 0.6,
        stagger: 0.1,
        scrollTrigger: {
          trigger: '.benefits-section',
          start: 'top 80%',
        },
      });

      gsap.from('.pricing-card', {
        y: 40,
        opacity: 0,
        duration: 0.8,
        stagger: 0.15,
        scrollTrigger: {
          trigger: '.pricing-section',
          start: 'top 80%',
        },
      });
    });

    return () => {
      ctx.revert();
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <div className="landing-page">
      {/* Header */}
      <header className={`header ${scrolled ? 'scrolled' : ''}`}>
        <div className="container">
          <div className="header-content">
            <div className="logo">
              <img src="/assets/logo.png" alt="Theta Pulse Logo" className="auth-logo-icon" />
              <span className="logo-text">Theta Pulse</span>
            </div>

            <nav className={`nav ${mobileMenuOpen ? 'open' : ''}`}>
              <a href="#features" onClick={() => setMobileMenuOpen(false)}>Features</a>
              <a href="#benefits" onClick={() => setMobileMenuOpen(false)}>Benefits</a>
              <a href="#pricing" onClick={() => setMobileMenuOpen(false)}>Pricing</a>
              <a href="#resources" onClick={() => setMobileMenuOpen(false)}>Resources</a>
              <div className="nav-buttons">
                <button onClick={() => navigate('/login')} className="btn-text">
                  Log In
                </button>
                <button onClick={() => navigate('/signup')} className="btn-primary">
                  Start Free Trial
                  <ArrowRight size={16} />
                </button>
              </div>
            </nav>

            <button
              className="mobile-menu-toggle"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero-section" ref={heroRef}>
        <div className="hero-background">
          <div className="gradient-orb orb-1"></div>
          <div className="gradient-orb orb-2"></div>
          <div className="gradient-orb orb-3"></div>
        </div>
        <div className="container">
          <div className="hero-content">
            <div className="hero-badge">
              <Sparkles size={16} />
              <span>Enterprise Project Management Office</span>
            </div>
            <h1 className="hero-title">
              Transform EDDR Data Into
              <br />
              <span className="gradient-text">Operational Intelligence</span>
            </h1>
            <p className="hero-subtitle">
              Automate your Engineering Document Delivery Record processing with
              intelligent automation. Extract, analyze, and transform data in seconds—delivering complete operational clarity.
            </p>
            <div className="hero-buttons">
              <button onClick={() => navigate('/signup')} className="btn-primary btn-hero">
                Start Free Trial
                <ArrowRight size={20} />
              </button>
              <button onClick={() => navigate('/login')} className="btn-secondary-outline btn-hero">
                Watch Demo
              </button>
            </div>
            <div className="trust-badge">
              <div className="trust-logos">
                <span>Trusted by engineering teams at</span>
                <div className="company-logos">
                  <div className="company-tag">Fortune 500</div>
                  <div className="company-tag">Tech Leaders</div>
                  <div className="company-tag">Global Enterprises</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section" id="features" ref={featuresRef}>
        <div className="container">
          <div className="section-header">
            <span className="section-label">FEATURES</span>
            <h2>Everything You Need for Document Intelligence</h2>
            <p>Enterprise-grade features designed for modern engineering teams</p>
          </div>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <Sparkles size={28} />
              </div>
              <h3>AI-Powered Extraction</h3>
              <p>
                Intelligent document processing with machine learning algorithms that
                understand context and extract data with 99.9% accuracy.
              </p>
              <ul className="feature-list">
                <li><CheckCircle size={16} /> Smart data recognition</li>
                <li><CheckCircle size={16} /> Auto-validation rules</li>
                <li><CheckCircle size={16} /> Error detection & correction</li>
              </ul>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <Clock size={28} />
              </div>
              <h3>Real-Time Processing</h3>
              <p>
                Upload EDDR files and get instant results. No waiting, no delays—process
                hundreds of documents in seconds.
              </p>
              <ul className="feature-list">
                <li><CheckCircle size={16} /> Batch processing</li>
                <li><CheckCircle size={16} /> Live progress tracking</li>
                <li><CheckCircle size={16} /> Instant notifications</li>
              </ul>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <BarChart3 size={28} />
              </div>
              <h3>Custom Workflows</h3>
              <p>
                Configure output columns, create custom fields, and automate your
                unique workflow requirements with ease.
              </p>
              <ul className="feature-list">
                <li><CheckCircle size={16} /> Flexible column mapping</li>
                <li><CheckCircle size={16} /> Custom field builder</li>
                <li><CheckCircle size={16} /> Template library</li>
              </ul>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <Shield size={28} />
              </div>
              <h3>Enterprise Security</h3>
              <p>
                Bank-level encryption, SSO integration, and compliance with industry
                standards to keep your data safe.
              </p>
              <ul className="feature-list">
                <li><CheckCircle size={16} /> 256-bit encryption</li>
                <li><CheckCircle size={16} /> SSO & SAML</li>
                <li><CheckCircle size={16} /> SOC 2 compliant</li>
              </ul>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <TrendingUp size={28} />
              </div>
              <h3>Advanced Analytics</h3>
              <p>
                Gain insights with comprehensive dashboards, real-time metrics, and
                detailed reporting capabilities.
              </p>
              <ul className="feature-list">
                <li><CheckCircle size={16} /> Visual dashboards</li>
                <li><CheckCircle size={16} /> Export to Excel/PDF</li>
                <li><CheckCircle size={16} /> Custom reports</li>
              </ul>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <Globe size={28} />
              </div>
              <h3>API Integration</h3>
              <p>
                Seamlessly integrate with your existing tools using our robust REST API
                and webhooks for automation.
              </p>
              <ul className="feature-list">
                <li><CheckCircle size={16} /> RESTful API</li>
                <li><CheckCircle size={16} /> Webhook support</li>
                <li><CheckCircle size={16} /> SDK libraries</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="benefits-section" id="benefits">
        <div className="container">
          <div className="benefits-content">
            <div className="benefits-text">
              <span className="section-label">WHY THETA PULSE</span>
              <h2>Built for Speed, Precision, and Scale</h2>
              <p className="benefits-intro">
                Theta Pulse transforms the way organizations handle document processing.
                Say goodbye to manual data entry and hello to intelligent automation.
              </p>
              <div className="benefit-items">
                <div className="benefit-item">
                  <div className="benefit-icon">
                    <Zap size={24} />
                  </div>
                  <div>
                    <h4>10x Faster Processing</h4>
                    <p>Reduce processing time from hours to seconds with AI automation</p>
                  </div>
                </div>
                <div className="benefit-item">
                  <div className="benefit-icon">
                    <Shield size={24} />
                  </div>
                  <div>
                    <h4>99.9% Accuracy</h4>
                    <p>Machine learning ensures precise data extraction every time</p>
                  </div>
                </div>
                <div className="benefit-item">
                  <div className="benefit-icon">
                    <Users size={24} />
                  </div>
                  <div>
                    <h4>Team Collaboration</h4>
                    <p>Share workflows, templates, and insights across your organization</p>
                  </div>
                </div>
                <div className="benefit-item">
                  <div className="benefit-icon">
                    <TrendingUp size={24} />
                  </div>
                  <div>
                    <h4>Cost Savings</h4>
                    <p>Save up to 80% on document processing costs</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="benefits-visual">
              <div className="visual-card">
                <div className="visual-stats">
                  <div className="stat-large">
                    <span className="stat-number">500+</span>
                    <span className="stat-label">Companies</span>
                  </div>
                  <div className="stat-large">
                    <span className="stat-number">1M+</span>
                    <span className="stat-label">Documents</span>
                  </div>
                  <div className="stat-large">
                    <span className="stat-number">99.9%</span>
                    <span className="stat-label">Uptime</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="pricing-section" id="pricing">
        <div className="container">
          <div className="section-header">
            <span className="section-label">PRICING</span>
            <h2>Simple, Transparent Pricing</h2>
            <p>Start free, scale as you grow. No hidden fees.</p>
          </div>
          <div className="pricing-grid">
            <div className="pricing-card">
              <div className="plan-header">
                <div className="plan-name">
                  <Zap size={24} />
                  <h3>Starter</h3>
                </div>
                <div className="price">
                  <span className="amount">$0</span>
                  <span className="period">/month</span>
                </div>
                <p className="plan-description">Perfect for trying out Theta Pulse</p>
              </div>
              <ul className="plan-features">
                <li><CheckCircle size={18} /> 1 file upload per day</li>
                <li><CheckCircle size={18} /> Up to 3 total uploads</li>
                <li><CheckCircle size={18} /> Basic output columns</li>
                <li><CheckCircle size={18} /> 7-day history retention</li>
                <li><CheckCircle size={18} /> Email support</li>
                <li><CheckCircle size={18} /> Community access</li>
              </ul>
              <button onClick={() => navigate('/signup')} className="btn-secondary-outline btn-block">
                Start Free
                <ArrowRight size={18} />
              </button>
            </div>

            <div className="pricing-card featured">
              <div className="badge-popular">
                <Sparkles size={14} />
                Most Popular
              </div>
              <div className="plan-header">
                <div className="plan-name">
                  <TrendingUp size={24} />
                  <h3>Professional</h3>
                </div>
                <div className="price">
                  <span className="amount">$49</span>
                  <span className="period">/month</span>
                </div>
                <p className="plan-description">For teams that need more power</p>
              </div>
              <ul className="plan-features">
                <li><CheckCircle size={18} /> <strong>Unlimited</strong> file uploads</li>
                <li><CheckCircle size={18} /> Custom output columns</li>
                <li><CheckCircle size={18} /> Advanced analytics & insights</li>
                <li><CheckCircle size={18} /> Unlimited history</li>
                <li><CheckCircle size={18} /> Priority email support</li>
                <li><CheckCircle size={18} /> Export to multiple formats</li>
                <li><CheckCircle size={18} /> Batch processing</li>
                <li><CheckCircle size={18} /> API access (beta)</li>
              </ul>
              <button onClick={() => navigate('/signup')} className="btn-primary btn-block">
                Start Pro Trial
                <ArrowRight size={18} />
              </button>
              <p className="trial-note">14-day free trial • No credit card required</p>
            </div>

            <div className="pricing-card">
              <div className="plan-header">
                <div className="plan-name">
                  <Users size={24} />
                  <h3>Enterprise</h3>
                </div>
                <div className="price">
                  <span className="amount">Custom</span>
                </div>
                <p className="plan-description">For organizations at scale</p>
              </div>
              <ul className="plan-features">
                <li><CheckCircle size={18} /> Everything in Professional</li>
                <li><CheckCircle size={18} /> SSO & SAML authentication</li>
                <li><CheckCircle size={18} /> Dedicated account manager</li>
                <li><CheckCircle size={18} /> Custom integrations</li>
                <li><CheckCircle size={18} /> Advanced security controls</li>
                <li><CheckCircle size={18} /> SLA guarantee (99.9%)</li>
                <li><CheckCircle size={18} /> 24/7 phone support</li>
                <li><CheckCircle size={18} /> Training & onboarding</li>
                <li><CheckCircle size={18} /> White-label options</li>
              </ul>
              <button onClick={() => navigate('/signup')} className="btn-secondary-outline btn-block">
                Contact Sales
                <ArrowRight size={18} />
              </button>
            </div>
          </div>

          <div className="pricing-faq">
            <h3>Frequently Asked Questions</h3>
            <div className="faq-grid">
              <div className="faq-item">
                <h4>Can I change plans anytime?</h4>
                <p>Yes! Upgrade or downgrade your plan at any time. Changes take effect immediately.</p>
              </div>
              <div className="faq-item">
                <h4>What payment methods do you accept?</h4>
                <p>We accept all major credit cards, PayPal, and wire transfer for Enterprise plans.</p>
              </div>
              <div className="faq-item">
                <h4>Is there a free trial?</h4>
                <p>Yes! Professional plan includes a 14-day free trial. No credit card required.</p>
              </div>
              <div className="faq-item">
                <h4>What about data security?</h4>
                <p>We use bank-level 256-bit encryption and are SOC 2 Type II certified.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="container">
          <div className="cta-content">
            <h2>Ready to Transform Your Document Processing?</h2>
            <p>Join 500+ organizations already using Theta Pulse to automate their workflows</p>
            <div className="cta-buttons">
              <button onClick={() => navigate('/signup')} className="btn-primary btn-hero">
                Start Free Trial
                <ArrowRight size={20} />
              </button>
              <button onClick={() => navigate('/login')} className="btn-secondary-outline btn-hero">
                Schedule Demo
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-top">
            <div className="footer-brand">
              <div className="logo">
                <img src="/assets/logo.png" alt="Theta Pulse Logo" className="auth-logo-icon" />
                <span className="logo-text">Theta Pulse</span>
              </div>
              <p className="footer-tagline">
                Enterprise project management and intelligent document processing for modern organizations.
              </p>
              <div className="footer-social">
                <a href="#" aria-label="LinkedIn">LinkedIn</a>
                <a href="#" aria-label="Twitter">Twitter</a>
                <a href="#" aria-label="GitHub">GitHub</a>
              </div>
            </div>

            <div className="footer-links">
              <div className="footer-column">
                <h4>Product</h4>
                <ul>
                  <li><a href="#features">Features</a></li>
                  <li><a href="#pricing">Pricing</a></li>
                  <li><a href="#">API Documentation</a></li>
                  <li><a href="#">Integrations</a></li>
                  <li><a href="#">Changelog</a></li>
                </ul>
              </div>

              <div className="footer-column">
                <h4>Company</h4>
                <ul>
                  <li><a href="#">About Us</a></li>
                  <li><a href="#">Careers</a></li>
                  <li><a href="#">Blog</a></li>
                  <li><a href="#">Press Kit</a></li>
                  <li><a href="#">Contact</a></li>
                </ul>
              </div>

              <div className="footer-column">
                <h4>Resources</h4>
                <ul>
                  <li><a href="#">Help Center</a></li>
                  <li><a href="#">Community</a></li>
                  <li><a href="#">Tutorials</a></li>
                  <li><a href="#">Status</a></li>
                  <li><a href="#">Security</a></li>
                </ul>
              </div>

              <div className="footer-column">
                <h4>Legal</h4>
                <ul>
                  <li><a href="#">Privacy Policy</a></li>
                  <li><a href="#">Terms of Service</a></li>
                  <li><a href="#">Cookie Policy</a></li>
                  <li><a href="#">GDPR</a></li>
                  <li><a href="#">Compliance</a></li>
                </ul>
              </div>
            </div>
          </div>

          <div className="footer-bottom">
            <p>&copy; 2026 Pulse AI. All rights reserved.</p>
            <div className="footer-badges">
              <span className="badge-security">SOC 2 Type II</span>
              <span className="badge-security">ISO 27001</span>
              <span className="badge-security">GDPR Compliant</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
