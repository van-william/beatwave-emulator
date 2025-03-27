import { Button } from "./ui/button"
import { useAuth } from "../contexts/AuthContext"

export function LoginButton() {
  const { user, signInWithGoogle, signOut } = useAuth()

  return (
    <Button
      onClick={user ? signOut : signInWithGoogle}
      variant="outline"
      className="w-full"
    >
      {user ? 'Sign Out' : 'Sign in with Google'}
    </Button>
  )
} 