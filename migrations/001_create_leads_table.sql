-- Wheelztracker Lead Agent - Initial Schema

CREATE TABLE IF NOT EXISTS leads (
  id SERIAL PRIMARY KEY,
  phone_number VARCHAR(20) NOT NULL,
  name VARCHAR(100),
  vehicle_type VARCHAR(100),
  vehicle_number VARCHAR(50),
  status VARCHAR(50) DEFAULT 'new',
  conversation_history TEXT,
  payment_link TEXT,
  payment_link_id VARCHAR(100),
  razorpay_payment_id VARCHAR(100),
  amount INTEGER DEFAULT 2999,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  lead_id INTEGER REFERENCES leads(id),
  direction VARCHAR(10),
  message_body TEXT,
  twilio_sid VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agent_logs (
  id SERIAL PRIMARY KEY,
  lead_id INTEGER,
  action VARCHAR(100),
  details TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leads_phone_number ON leads(phone_number);
CREATE INDEX IF NOT EXISTS idx_leads_payment_link_id ON leads(payment_link_id);
CREATE INDEX IF NOT EXISTS idx_messages_lead_id ON messages(lead_id);
