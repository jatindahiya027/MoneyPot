import Image from "next/image"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { easeOut, motion } from "@/components/ui/motion"
import { cn } from "@/lib/utils"

export function AuthShell({ title, description, children, error, className }) {
  return (
    <main className="login">
      <motion.div className="auth-brand" aria-label="MoneyPot" initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} transition={{duration:.3,ease:easeOut}}>
        <Image alt="" src="/logo-pot-only.png" height={40} width={40} priority />
        <span>MoneyPot</span>
      </motion.div>
      <motion.section className={cn("loginform", className)} aria-labelledby="auth-title" initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{duration:.34,ease:easeOut}}>
        <header className="auth-header">
          <h1 id="auth-title" className="loginhead">{title}</h1>
          {description && <p>{description}</p>}
        </header>
        {children}
        {error && <Alert variant="destructive" className="auth-alert"><AlertDescription>{error}</AlertDescription></Alert>}
      </motion.section>
    </main>
  )
}
