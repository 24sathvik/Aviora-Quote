import { createClient } from '@supabase/supabase-js'

const url = 'https://yrncaebimjmwhqltroqi.supabase.co'
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlybmNhZWJpbWptd2hxbHRyb3FpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5MTE4MDAsImV4cCI6MjEwMTQ4NzgwMH0.Bb2jMa-MJWK2tt9MdfniXiS4yLyIEtMbMzAywIQKlJ0'

const supabase = createClient(url, key)

async function inspectSignatures() {
  console.log('--- Testing create_invoice call with empty params to reveal signature ---')
  const { data: invData, error: invErr } = await supabase.rpc('create_invoice', {})
  console.log('create_invoice error:', invErr)

  console.log('\n--- Testing resync_numbering_sequence call with empty params to reveal signature ---')
  const { data: resyncData, error: resyncErr } = await supabase.rpc('resync_numbering_sequence', {})
  console.log('resync_numbering_sequence error:', resyncErr)
}

inspectSignatures()
