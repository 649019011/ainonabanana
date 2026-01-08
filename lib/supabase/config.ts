function getRequiredEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

export const supabaseUrl = getRequiredEnv('SUPABASE_URL')
export const supabaseAnonKey = getRequiredEnv('SUPABASE_ANON_KEY')

