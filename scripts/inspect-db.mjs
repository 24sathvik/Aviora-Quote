import { createClient } from '@supabase/supabase-js'

const url = 'https://yrncaebimjmwhqltroqi.supabase.co'
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlybmNhZWJpbWptd2hxbHRyb3FpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5MTE4MDAsImV4cCI6MjEwMTQ4NzgwMH0.Bb2jMa-MJWK2tt9MdfniXiS4yLyIEtMbMzAywIQKlJ0'

const supabase = createClient(url, key)

async function inspect() {
  console.log('--- Inspecting numbering_sequences ---')
  const { data: numSeq, error: numErr } = await supabase
    .from('numbering_sequences')
    .select('*')
  
  if (numErr) {
    console.error('Error fetching numbering_sequences:', numErr)
  } else {
    console.log('numbering_sequences rows:', JSON.stringify(numSeq, null, 2))
  }
}

inspect()
