import React from 'react';
import { Gem, ArrowRight, X, Zap, BarChart3, Shield, Infinity } from 'lucide-react';
import './UpgradeModal.css';

const UpgradeModal = ({ isOpen, onClose, onUpgrade }) => {
    if (!isOpen) return null;

    return (
        <div className="upgrade-overlay" onClick={onClose}>
            <div className="upgrade-modal" onClick={(e) => e.stopPropagation()}>
                <button className="upgrade-close" onClick={onClose}>
                    <X size={20} />
                </button>

                <div className="upgrade-icon-wrapper">
                    <div className="upgrade-icon">
                        <Gem size={32} />
                    </div>
                    <div className="upgrade-pulse" />
                </div>

                <h2 className="upgrade-title">Upgrade to Professional</h2>
                <p className="upgrade-subtitle">
                    You've reached your free plan limit. Unlock the full power of Theta Pulse today.
                </p>

                <div className="upgrade-features">
                    <div className="upgrade-feature">
                        <Infinity size={18} />
                        <span>Unlimited file processing</span>
                    </div>
                    <div className="upgrade-feature">
                        <BarChart3 size={18} />
                        <span>Advanced analytics & insights</span>
                    </div>
                    <div className="upgrade-feature">
                        <Shield size={18} />
                        <span>Priority support & SLA</span>
                    </div>
                    <div className="upgrade-feature">
                        <Zap size={18} />
                        <span>Batch processing & API access</span>
                    </div>
                </div>

                <div className="upgrade-pricing">
                    <span className="upgrade-price">$49</span>
                    <span className="upgrade-period">/month</span>
                </div>
                <p className="upgrade-trial">14-day free trial · No credit card required</p>

                <div className="upgrade-actions">
                    <button className="upgrade-btn-primary" onClick={onUpgrade}>
                        <Gem size={18} />
                        Switch to Pro
                        <ArrowRight size={18} />
                    </button>
                    <button className="upgrade-btn-secondary" onClick={onClose}>
                        Maybe Later
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UpgradeModal;
