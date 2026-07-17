import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import toast from 'react-hot-toast';
import {
  Gem,
  CheckCircle,
  Zap,
  Shield,
  Users,
  CreditCard,
  TrendingUp,
  Loader2,
  Sparkles,
  FileSpreadsheet,
  Menu,
  X,
} from 'lucide-react';
import useStore from '../store/useStore';
import { subscriptionService } from '../services/api';
import Sidebar from '../components/Sidebar';
import './Subscription.css';

const Subscription = () => {
  const navigate = useNavigate();
  const { subscription, setSubscription, user, logout } = useStore();
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [upgradingTo, setUpgradingTo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const subscriptionRef = useRef(null);

  useEffect(() => {
    // Wait for subscription data to load
    if (subscription) {
      setIsLoading(false);

      // Simplified animations for better performance
      // Set elements visible immediately, then animate position only
      gsap.set('.subscription-header, .current-plan, .pricing-card', { opacity: 1 });

      const ctx = gsap.context(() => {
        gsap.fromTo('.subscription-header',
          { y: -10 },
          { y: 0, duration: 0.4, ease: 'power2.out', clearProps: 'transform' }
        );

        gsap.fromTo('.pricing-card',
          { y: 10 },
          { y: 0, duration: 0.3, stagger: 0.1, delay: 0.2, ease: 'power2.out', clearProps: 'transform' }
        );
      });

      return () => ctx.revert();
    }
  }, [subscription]);

  const handleUpgrade = async (plan) => {
    if (plan === 'free' || plan === subscription?.plan) return;

    setIsUpgrading(true);
    setUpgradingTo(plan);

    try {
      const response = await subscriptionService.upgrade(plan);
      setSubscription(response.subscription);
      toast.success(`Successfully upgraded to ${plan.toUpperCase()} plan!`);

      // Reload page after short delay
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error('Upgrade failed:', error);
      toast.error('Failed to upgrade subscription');
    } finally {
      setIsUpgrading(false);
      setUpgradingTo(null);
    }
  };

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  const plans = [
    {
      id: 'free',
      name: 'Starter',
      price: '$0',
      period: '/month',
      icon: <Zap size={28} />,
      color: '#666666',
      description: 'Perfect for trying out Pulse',
      features: [
        '1 file upload per day',
        'Up to 3 total uploads',
        'Basic output columns',
        '7-day history retention',
        'Email support',
        'Community access',
      ],
    },
    {
      id: 'pro',
      name: 'Professional',
      price: '$49',
      period: '/month',
      icon: <Gem size={28} />,
      color: '#0073ea',
      recommended: true,
      description: 'For teams that need more power',
      features: [
        'Unlimited file uploads',
        'Custom output columns',
        'Advanced analytics & insights',
        'Unlimited history',
        'Priority email support',
        'Export to multiple formats',
        'Batch processing',
        'API access (beta)',
      ],
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: 'Custom',
      period: '',
      icon: <Users size={28} />,
      color: '#1a1a1a',
      description: 'For organizations at scale',
      features: [
        'Everything in Professional',
        'SSO & SAML authentication',
        'Dedicated account manager',
        'Custom integrations',
        'Advanced security controls',
        'SLA guarantee (99.9%)',
        '24/7 phone support',
        'Training & onboarding',
        'White-label options',
      ],
    },
  ];

  const currentPlanData = plans.find((p) => p.id === subscription?.plan) || plans[0];

  if (!subscription) {
    return (
      <div className="subscription-page loading-page">
        <Loader2 size={48} className="spinning" />
        <p>Loading subscription...</p>
      </div>
    );
  }

  return (
    <div className="subscription-page" ref={subscriptionRef}>
      {isLoading && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(255, 255, 255, 0.9)',
          zIndex: 9999
        }}>
          <Loader2 size={48} className="spinning" style={{ color: '#10b981' }} />
        </div>
      )}

      {/* Mobile Menu Button */}
      <button
        className="mobile-menu-button"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        aria-label="Toggle menu"
      >
        {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Mobile Overlay */}
      <div
        className={`mobile-sidebar-overlay ${isMobileMenuOpen ? 'open' : ''}`}
        onClick={() => setIsMobileMenuOpen(false)}
      />

      <Sidebar isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} />

      {/* Main Content */}
      <div className="main-content">
        <div className="subscription-container">
          <div className="subscription-header">
            <div>
              <h1>Plans & Billing</h1>
              <p>Choose the perfect plan for your project management needs</p>
            </div>
          </div>

          {/* Current Plan */}
          <div className="current-plan card">
            <div className="plan-badge">Current Plan</div>
            <div className="plan-info">
              <div className="plan-icon" style={{ background: `${currentPlanData.color}20` }}>
                {currentPlanData.icon}
              </div>
              <div>
                <h2>{currentPlanData.name}</h2>
                <p className="plan-price">
                  {currentPlanData.price}
                  <span>{currentPlanData.period}</span>
                </p>
              </div>
            </div>
            <div className="plan-stats">
              <div className="stat-item">
                <TrendingUp size={20} />
                <div>
                  <strong>{subscription.uploads_today}</strong>
                  <span>Uploads Today</span>
                </div>
              </div>
              <div className="stat-item">
                <CreditCard size={20} />
                <div>
                  <strong>{subscription.total_uploads}</strong>
                  <span>Total Uploads</span>
                </div>
              </div>
              <div className="stat-item">
                <Shield size={20} />
                <div>
                  <strong>{subscription.is_locked ? 'Locked' : 'Active'}</strong>
                  <span>Status</span>
                </div>
              </div>
            </div>
            {subscription.plan === 'free' && (
              <div className="upgrade-cta">
                <p>Unlock unlimited uploads and advanced features</p>
                <button className="btn-primary" onClick={() => document.getElementById('plans').scrollIntoView({ behavior: 'smooth' })}>
                  <Gem size={18} />
                  Upgrade Now
                </button>
              </div>
            )}
          </div>

          {/* Pricing Plans */}
          <div id="plans" className="pricing-section">
            <div className="section-header">
              <h2>All Plans</h2>
              <p>Select the plan that best fits your workflow</p>
            </div>

            <div className="pricing-grid">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className={`pricing-card card ${plan.recommended ? 'recommended' : ''} ${subscription.plan === plan.id ? 'current' : ''
                    }`}
                >
                  {plan.recommended && <div className="badge-recommended">Most Popular</div>}
                  {subscription.plan === plan.id && <div className="badge-current">Current Plan</div>}

                  <div className="pricing-header">
                    <div
                      className="pricing-icon"
                      style={{ background: `${plan.color}20`, color: plan.color }}
                    >
                      {plan.icon}
                    </div>
                    <h3>{plan.name}</h3>
                    <div className="pricing-price">
                      <span className="amount">{plan.price}</span>
                      <span className="period">{plan.period}</span>
                    </div>
                  </div>

                  <ul className="pricing-features">
                    {plan.features.map((feature, idx) => (
                      <li key={idx}>
                        <CheckCircle size={18} />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    className={`btn-block ${subscription.plan === plan.id
                      ? 'btn-secondary'
                      : plan.recommended
                        ? 'btn-primary'
                        : 'btn-secondary'
                      }`}
                    onClick={() => handleUpgrade(plan.id)}
                    disabled={subscription.plan === plan.id || isUpgrading}
                  >
                    {isUpgrading && upgradingTo === plan.id ? (
                      <>
                        <Loader2 size={18} className="spinning" />
                        Upgrading...
                      </>
                    ) : subscription.plan === plan.id ? (
                      'Current Plan'
                    ) : plan.id === 'enterprise' ? (
                      'Contact Sales'
                    ) : (
                      `Upgrade to ${plan.name}`
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* FAQ Section */}
          <div className="faq-section card">
            <h2>Frequently Asked Questions</h2>
            <div className="faq-grid">
              <div className="faq-item">
                <h4>Can I change plans anytime?</h4>
                <p>
                  Yes! You can upgrade or downgrade your plan at any time. Changes will be reflected
                  immediately.
                </p>
              </div>
              <div className="faq-item">
                <h4>What happens to my data if I downgrade?</h4>
                <p>
                  Your data remains safe. However, some features may be limited based on your new
                  plan.
                </p>
              </div>
              <div className="faq-item">
                <h4>Do you offer refunds?</h4>
                <p>
                  We offer a 30-day money-back guarantee for all paid plans. No questions asked.
                </p>
              </div>
              <div className="faq-item">
                <h4>Is my payment information secure?</h4>
                <p>
                  Absolutely! We use industry-standard encryption and never store your full payment
                  details.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Subscription;