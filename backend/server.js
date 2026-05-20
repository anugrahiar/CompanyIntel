const path = require('path');

require('dotenv').config({
  path: path.join(__dirname, '.env')
});



const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');
const axios = require('axios');
const fs = require('fs');

const app = express();
// Middleware
app.use(cors());
app.use(express.json());

// Create reports directory if it doesn't exist
const reportsDir = path.join(__dirname, 'reports');
if (!fs.existsSync(reportsDir)) {
  fs.mkdirSync(reportsDir);
  console.log('📁 Reports directory created');
}

//  EMAIL CONFIGURATION 
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASSWORD,
  },
});

// Test email configuration
transporter.verify((error, success) => {
  if (error) {
    console.log('❌ Email configuration error:', error.message);
  } else {
    console.log('✅ Email service ready');
  }
});

// Find COMPANY DATA WITH GROQ AI ============
async function enrichCompanyData(companyName, industry, website) {
  try {
    console.log(`🔍 Enriching data for: ${companyName}`);
    
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error('GROQ_API_KEY is not set in .env file');
    }

    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.1-8b-instant',
        messages: [
          {
            role: 'system',
            content: 'You are a business intelligence analyst. Respond ONLY with valid JSON, no markdown or code blocks.'
          },
          {
            role: 'user',
            content: `Provide a professional business profile for "${companyName}" in the ${industry} industry.
Website: ${website || 'Not provided'}

Return ONLY this JSON structure:
{
  "companyDescription": "2-3 sentences describing the company's core business",
  "keyServices": ["service1", "service2", "service3"],
  "targetMarket": "Brief description of who they serve",
  "strengths": ["strength1", "strength2", "strength3"],
  "opportunities": ["opportunity1", "opportunity2", "opportunity3"]
}`
          }
        ],
        temperature: 0.7,
        max_tokens: 500
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    if (response.data.choices && response.data.choices[0]) {
      const content = response.data.choices[0].message.content;
      console.log('📝 Groq response received');
      
      try {
        const parsed = JSON.parse(content);
        console.log('✓ JSON parsed successfully');
        return parsed;
      } catch (parseError) {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          console.log('✓ JSON extracted and parsed successfully');
          return parsed;
        }
        throw parseError;
      }
    } else {
      throw new Error('No response from Groq API');
    }
  } catch (error) {
    console.error(
  '❌ Groq API error:',
  JSON.stringify(error.response?.data || error.message, null, 2)
);
    console.log('⚠️ Using fallback data');
  }

  // Fallback data if API fails
  return {
    companyDescription: `${companyName} is a professional company operating in the ${industry} sector. They provide specialized services and solutions designed to meet the unique needs of their target market.`,
    keyServices: ['Strategic Consulting', 'Professional Services', 'Client Support'],
    targetMarket: 'Enterprise and mid-market organizations seeking specialized expertise and solutions',
    strengths: [
      'Industry expertise and experience',
      'Professional and dedicated team',
      'Proven track record of success'
    ],
    opportunities: [
      'Market expansion and growth',
      'Digital transformation initiatives',
      'Strategic partnership development'
    ],
  };
}

//  GENERATE PDF REPORT 
function generatePDFReport(leadData, enrichedData, fileName) {
  return new Promise((resolve, reject) => {
    const filePath = path.join(reportsDir, fileName);
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const stream = fs.createWriteStream(filePath);

    doc.pipe(stream);

    // Title
    doc.fontSize(28)
      .font('Helvetica-Bold')
      .fillColor('#1a365d')
      .text('ComapnyIntel Intelligence Report', 50, 50);

    // Subtitle and date
    doc.fontSize(11)
      .fillColor('#666666')
      .font('Helvetica')
      .text(`Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, 50, 85);

    // Divider 
    doc.moveTo(50, 100).lineTo(550, 100).stroke('#e2e8f0');

    // Company Overview Section
    doc.fontSize(16)
      .font('Helvetica-Bold')
      .fillColor('#2d3748')
      .text('Company Overview', 50, 115);

    // Company details
    const detailsY = 140;
    const detailsLabelX = 50;
    const detailsValueX = 180;

    doc.fontSize(12).font('Helvetica-Bold').fillColor('#2d3748');
    doc.text('Company Name:', detailsLabelX, detailsY);
    doc.fontSize(11).font('Helvetica').fillColor('#4a5568');
    doc.text(leadData.companyName, detailsValueX, detailsY);

    doc.fontSize(12).font('Helvetica-Bold').fillColor('#2d3748');
    doc.text('Industry:', detailsLabelX, detailsY + 25);
    doc.fontSize(11).font('Helvetica').fillColor('#4a5568');
    doc.text(leadData.industry, detailsValueX, detailsY + 25);

    doc.fontSize(12).font('Helvetica-Bold').fillColor('#2d3748');
    doc.text('Website:', detailsLabelX, detailsY + 50);
    doc.fontSize(11).font('Helvetica').fillColor('#4a5568');
    doc.text(leadData.website || 'Not provided', detailsValueX, detailsY + 50);

    doc.fontSize(12).font('Helvetica-Bold').fillColor('#2d3748');
    doc.text('Contact:', detailsLabelX, detailsY + 75);
    doc.fontSize(11).font('Helvetica').fillColor('#4a5568');
    doc.text(`${leadData.name} (${leadData.email})`, detailsValueX, detailsY + 75);

    // Business Profile Section
    doc.moveTo(50, 265).lineTo(550, 265).stroke('#e2e8f0');
    doc.fontSize(16)
      .font('Helvetica-Bold')
      .fillColor('#2d3748')
      .text('Business Profile', 50, 280);

    doc.fontSize(11)
      .font('Helvetica')
      .fillColor('#4a5568')
      .text(enrichedData.companyDescription, 50, 305, {
        width: 500,
        align: 'left',
        lineGap: 5,
      });

    // Key Services Section
    doc.moveTo(50, 380).lineTo(550, 380).stroke('#e2e8f0');
    doc.fontSize(16)
      .font('Helvetica-Bold')
      .fillColor('#2d3748')
      .text('Key Services', 50, 395);

    let servicesY = 420;
    enrichedData.keyServices.forEach((service) => {
      doc.fontSize(11)
        .font('Helvetica')
        .fillColor('#4a5568')
        .text(`• ${service}`, 70, servicesY);
      servicesY += 20;
    });

    // Target Market Section
    doc.fontSize(16)
      .font('Helvetica-Bold')
      .fillColor('#2d3748')
      .text('Target Market', 50, servicesY + 15);

    doc.fontSize(11)
      .font('Helvetica')
      .fillColor('#4a5568')
      .text(enrichedData.targetMarket, 50, servicesY + 40, {
        width: 500,
        align: 'left',
        lineGap: 5,
      });

    // Strengths Section
    doc.moveTo(50, servicesY + 85).lineTo(550, servicesY + 85).stroke('#e2e8f0');
    doc.fontSize(16)
      .font('Helvetica-Bold')
      .fillColor('#2d3748')
      .text('Key Strengths', 50, servicesY + 100);

    let strengthsY = servicesY + 125;
    enrichedData.strengths.forEach((strength) => {
      doc.fontSize(11)
        .font('Helvetica')
        .fillColor('#4a5568')
        .text(`✓ ${strength}`, 70, strengthsY);
      strengthsY += 20;
    });

    // Growth Opportunities Section
    doc.fontSize(16)
      .font('Helvetica-Bold')
      .fillColor('#2d3748')
      .text('Growth Opportunities', 50, strengthsY + 15);

    let oppY = strengthsY + 40;
    enrichedData.opportunities.forEach((opportunity) => {
      doc.fontSize(11)
        .font('Helvetica')
        .fillColor('#4a5568')
        .text(`→ ${opportunity}`, 70, oppY);
      oppY += 20;
    });

    // Footer
    doc.moveTo(50, 750).lineTo(550, 750).stroke('#e2e8f0');
    doc.fontSize(9)
      .font('Helvetica')
      .fillColor('#a0aec0')
      .text('This report is confidential and prepared for the recipient only.', 50, 765);
    doc.fontSize(9)
      .fillColor('#a0aec0')
      .text('Powered by CompanyIntel - AI-Powered Lead Intelligence', 50, 780);

    doc.end();

    stream.on('finish', () => {
      console.log(`✓ PDF created: ${fileName}`);
      resolve(filePath);
    });

    stream.on('error', (err) => {
      console.error('PDF generation error:', err);
      reject(err);
    });
  });
}

// SEND EMAIL WITH ATTACHMENT 
async function sendEmailReport(email, companyName, contactName, pdfPath) {
  try {
    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: email,
      subject: `Your ComapnyIntel Intelligence Report - ${companyName}`,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #2d3748; max-width: 600px; margin: 0 auto; line-height: 1.6;">
          <div style="background-color: #f7fafc; padding: 20px; border-left: 4px solid #4299e1; margin-bottom: 20px; border-radius: 4px;">
           <h2 style="color: #2d3748; margin: 0 0 10px 0;">Hello ${contactName}! 🚀</h2>
          </div>
          
          <p>Thank you for submitting your information to CompanyIntel!</p>
          
          <p>We've analyzed <strong>${companyName}</strong> and created an AI-powered intelligence report with actionable insights for your business.</p>
          
          <div style="background-color: #edf2f7; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <h3 style="color: #2d3748; margin-top: 0;">📊 Your Report Includes:</h3>
            <ul style="color: #4a5568; margin: 10px 0;">
             <li>AI-powered company analysis</li>
             <li>Service & product insights</li>
             <li>Market positioning analysis</li>
             <li>Competitive strengths</li>
             <li>Growth opportunities</li>
            </ul>
          </div>
          
          <p><strong>Please find your complete audit report attached to this email.</strong></p>
          
          <p>We would love to discuss how ComapanyIntel can support your business growth and help you capitalize on the opportunities we've identified.</p>
          
          <p style="margin-top: 30px; color: #718096;">
            Best regards,<br/>
            <strong style="color: #2d3748;">CompanyIntel Team</strong><br/>
            <span style="font-size: 12px;">Intelligent Lead Insights Platform</span>
          </p>
        </div>
      `,
      attachments: [
        {
          filename: `${companyName}_Audit_Report.pdf`,
          path: pdfPath,
        },
      ],
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully');
    return true;
  } catch (error) {
    console.error('❌ Email sending error:', error.message);
    return false;
  }
}

// API ENDPOINT 
app.post('/api/process-lead', async (req, res) => {
  try {
    const { name, email, companyName, industry, website } = req.body;

    // Validation
    if (!name || !email || !companyName || !industry) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        required: ['name', 'email', 'companyName', 'industry'],
      });
    }

    console.log('\n' + '='.repeat(60));
    console.log(`📝 NEW LEAD RECEIVED`);
    console.log('='.repeat(60));
    console.log(`👤 Name: ${name}`);
    console.log(`📧 Email: ${email}`);
    console.log(`🏢 Company: ${companyName}`);
    console.log(`🏭 Industry: ${industry}`);
    console.log(`🌐 Website: ${website || 'Not provided'}`);
    console.log('='.repeat(60));

    // Find company data
    console.log('\n⏳ STEP 1: Enriching company data using Groq AI...');
    const enrichedData = await enrichCompanyData(companyName, industry, website || '');

    // Generate PDF
    console.log('\n📄 STEP 2: Generating professional PDF report...');
    const fileName = `${companyName.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
    const pdfPath = await generatePDFReport(
      { name, email, companyName, industry, website },
      enrichedData,
      fileName
    );

    // Send Email
    console.log('\n📧 STEP 3: Sending email with report attachment...');
    const emailSent = await sendEmailReport(email, companyName, name, pdfPath);

    // response
    const response = {
      success: true,
      message: 'Lead processed successfully',
      data: {
        companyName,
        email,
        reportGenerated: true,
        emailSent,
        fileName,
        timestamp: new Date().toISOString(),
      },
    };

    console.log('\n✅ LEAD PROCESSING COMPLETED');
    console.log('='.repeat(60) + '\n');

    res.json(response);
  } catch (error) {
    console.error('\n❌ ERROR PROCESSING LEAD:', error.message);
    console.log('='.repeat(60) + '\n');

    res.status(500).json({
      success: false,
      error: 'Failed to process lead',
      details: error.message,
    });
  }
});

// HEALTH CHECK ENDPOINT 
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'Backend running',
    ai_provider: 'Groq AI',
    email_service: 'Gmail SMTP',
    timestamp: new Date().toISOString(),
    port: process.env.PORT || 5000,
  });
});

// GET ALL REPORTS (for testing) 
app.get('/api/reports', (req, res) => {
  try {
    const files = fs.readdirSync(reportsDir);
    const reports = files.map(file => {
      const filePath = path.join(reportsDir, file);
      const stats = fs.statSync(filePath);
      return {
        fileName: file,
        size: `${(stats.size / 1024).toFixed(2)} KB`,
        created: stats.birthtimeMs,
        createdDate: new Date(stats.birthtimeMs).toISOString(),
      };
    });

    res.json({
      success: true,
      totalReports: files.length,
      reports: reports.sort((a, b) => b.created - a.created),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Could not read reports',
      details: error.message,
    });
  }
});

//  START SERVER 
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log('\n' + '='.repeat(60));
  console.log(`🚀 BACKEND SERVER STARTED`);
  console.log('='.repeat(60));
  console.log(`📍 Server: http://localhost:${PORT}`);
  console.log(`🤖 AI Provider: Groq AI `);
  console.log(`📧 Email Service: Gmail SMTP`);
  console.log(`📁 Reports Directory: ${reportsDir}`);
  console.log('='.repeat(60));
  console.log('✅ Server ready to receive leads!\n');
});