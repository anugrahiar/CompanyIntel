import React, { useState } from 'react';
import axios from 'axios';
import './CompanyIntel.css';

function CompanyIntel() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    companyName: '',
    industry: '',
    website: '',
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      // Validate form
      if (!formData.name || !formData.email || !formData.companyName || !formData.industry) {
        setMessageType('error');
        setMessage('Please fill in all required fields');
        setLoading(false);
        return;
      }

      console.log('Submitting form:', formData);

      // Send to backend
    const response = await axios.post(
`${process.env.REACT_APP_API_URL}/api/process-lead`,
formData
);
      if (response.data.success) {
        setMessageType('success');
        setMessage(`✅ Perfect! Your ComapnyIntel report is being created and sent to ${formData.email}`);
        
        // Reset form
        setFormData({
          name: '',
          email: '',
          companyName: '',
          industry: '',
          website: '',
        });
      }
    } catch (error) {
      setMessageType('error');
      if (error.response?.data?.error) {
        setMessage(`❌ Oops! ${error.response.data.error}`);
      } else {
      setMessage('❌ Connection issue: Backend not responding. Check your server.');
      }
      console.error('Submission error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="lead-form-container">
      <div className="form-card">
        <h1>ComapnyIntel</h1>
        <p className="subtitle">Enter your company details and get AI-powered insights instantly.</p>

        {message && (
          <div className={`message message-${messageType}`}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Your Name *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="John Smith"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email Address *</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="john@example.com"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="companyName">Company Name *</label>
            <input
              type="text"
              id="companyName"
              name="companyName"
              value={formData.companyName}
              onChange={handleChange}
              placeholder="Acme Corporation"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="industry">Industry *</label>
            <select
              id="industry"
              name="industry"
              value={formData.industry}
              onChange={handleChange}
              required
            >
              <option value="">Select an industry</option>
              <option value="Financial Services">Financial Services</option>
              <option value="Technology">Technology</option>
              <option value="Healthcare">Healthcare</option>
              <option value="Retail">Retail</option>
              <option value="Manufacturing">Manufacturing</option>
              <option value="Consulting">Consulting</option>
              <option value="SaaS">SaaS</option>
              <option value="E-commerce">E-commerce</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="website">Company Website</label>
            <input
              type="url"
              id="website"
              name="website"
              value={formData.website}
              onChange={handleChange}
              placeholder="https://example.com"
            />
          </div>

          <button type="submit" disabled={loading} className="submit-btn">
            {loading ? '⏳ Generating your report...' : '🚀 Generate My Report'}
          </button>
        </form>

       <p className="footer-text">
          ⚡ Your AI-powered report will be generated instantly and will be sent to your emial.
       </p> 
      </div>
    </div>
  );
}

export default CompanyIntel;