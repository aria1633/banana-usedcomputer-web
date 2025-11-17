-- Create banners table
CREATE TABLE IF NOT EXISTS banners (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT NOT NULL,
  link_url TEXT,
  button_text TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on display_order for faster sorting
CREATE INDEX IF NOT EXISTS idx_banners_display_order ON banners(display_order);

-- Create index on is_active for filtering active banners
CREATE INDEX IF NOT EXISTS idx_banners_is_active ON banners(is_active);

-- Enable Row Level Security
ALTER TABLE banners ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read active banners
CREATE POLICY "Anyone can read active banners"
  ON banners
  FOR SELECT
  USING (is_active = true);

-- Policy: Admins can read all banners
CREATE POLICY "Admins can read all banners"
  ON banners
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.uid = auth.uid()
      AND users.user_type = 'admin'
    )
  );

-- Policy: Only admins can insert banners
CREATE POLICY "Only admins can insert banners"
  ON banners
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.uid = auth.uid()
      AND users.user_type = 'admin'
    )
  );

-- Policy: Only admins can update banners
CREATE POLICY "Only admins can update banners"
  ON banners
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.uid = auth.uid()
      AND users.user_type = 'admin'
    )
  );

-- Policy: Only admins can delete banners
CREATE POLICY "Only admins can delete banners"
  ON banners
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.uid = auth.uid()
      AND users.user_type = 'admin'
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_banners_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
CREATE TRIGGER trigger_update_banners_updated_at
  BEFORE UPDATE ON banners
  FOR EACH ROW
  EXECUTE FUNCTION update_banners_updated_at();
