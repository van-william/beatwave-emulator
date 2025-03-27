import { Button } from "./ui/button"
import { useAuth } from "../contexts/AuthContext"

export function LoginButton() {
  const { user, signInWithGoogle, signOut } = useAuth()

  const handleSignIn = async () => {
    try {
      const redirectTo = window.location.hostname === 'localhost' 
        ? 'http://localhost:5173/auth/callback'
        : 'https://808-emulator.netlify.app/auth/callback'
      
      await signInWithGoogle(redirectTo)
    } catch (error) {
      console.error('Error signing in:', error)
    }
  }

  return (
    <Button
      onClick={user ? signOut : handleSignIn}
      variant="outline"
      className="w-full"
    >
      {user ? 'Sign Out' : 'Sign in with Google'}
    </Button>
  )
} 