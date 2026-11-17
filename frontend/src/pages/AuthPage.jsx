import { useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Eye, EyeOff, ShieldCheck } from 'lucide-react'
import Brand from '../components/Brand'
import { useAuth } from '../contexts/AuthContext'

export default function AuthPage({ mode }) {
    const isLogin = mode === 'login'
    const isRegister = mode === 'register'
    const isForgot = mode === 'forgot'
    const isReset = mode === 'reset'
    const { login, register, forgotPassword, resetPassword } = useAuth()
    const navigate = useNavigate()
    const location = useLocation()
    const [searchParams] = useSearchParams()
    const [showPassword, setShowPassword] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [password, setPassword] = useState('')

    function getErrorMessage(err) {
        const status = err.response?.status
        if (!err.response) return 'Could not reach ResearchVault. Check that the API is running and try again.'
        if (status === 401) return err.response.data?.error || 'The email or password is incorrect.'
        if (status === 409) return 'An account with this email already exists. Sign in instead.'
        if (status >= 500) return err.response.data?.error || 'ResearchVault is having trouble right now. Please try again.'
        return err.response.data?.error || 'Please check your details and try again.'
    }

    async function handleSubmit(event) {
        event.preventDefault()
        setError('')
        setSuccess('')
        const values = Object.fromEntries(new FormData(event.currentTarget).entries())

        if (isRegister || isReset) {
            if (values.password.length < 8) {
                setError('Choose a password with at least 8 characters.')
                return
            }
            if (values.password !== values.confirm_password) {
                setError('Your passwords do not match. Check both fields and try again.')
                return
            }
        }
        if (isReset && !searchParams.get('token')) {
            setError('This password reset link is missing its token. Request a new link.')
            return
        }

        setSubmitting(true)
        try {
            if (isForgot) {
                const result = await forgotPassword(values.email)
                setSuccess(result.message)
            } else if (isReset) {
                const result = await resetPassword({ token: searchParams.get('token'), password: values.password })
                setSuccess(result.message)
            } else if (isRegister) {
                delete values.confirm_password
                await register(values)
                navigate('/dashboard', { replace: true })
            } else {
                values.remember_me = values.remember_me === 'on'
                const user = await login(values)
                const destination = location.state?.from?.pathname || '/dashboard'
                navigate(destination, { replace: true, state: { signedInAs: user.email } })
            }
        } catch (err) {
            setError(getErrorMessage(err))
        } finally {
            setSubmitting(false)
        }
    }

    const heading = isLogin ? 'Welcome back to ResearchVault' : isRegister ? 'Create your research account' : isForgot ? 'Reset your password' : 'Choose a new password'
    const subtitle = isLogin ? 'Continue exploring your research knowledge base.' : isRegister ? 'Create an account to start your private research workspace.' : isForgot ? 'Enter your email and we’ll send you a secure reset link.' : 'Choose a new password for your ResearchVault account.'
    const submitLabel = isLogin ? 'Sign In' : isRegister ? 'Create ResearchVault Account' : isForgot ? 'Send Reset Link' : 'Update Password'

    return <main className="auth-page auth-light">
        <div className="auth-left">
            <Link className="auth-brand" to="/"><Brand /></Link>
            <div className="auth-form-wrap">
                <Link to="/" className="back-link"><ArrowLeft size={15} /> Back to ResearchVault</Link>
                <span className="section-kicker">YOUR RESEARCH, IN ONE PLACE</span>
                <h1>{heading}</h1>
                <p className="auth-intro">{subtitle}</p>
                {success ? <div className="auth-complete" role="status"><span className="auth-complete-icon"><ShieldCheck size={19} /></span><p>{success}</p><Link className="button button-primary auth-submit" to="/login">Back to Sign In <ArrowRight size={16} /></Link></div> : <form className="auth-form" onSubmit={handleSubmit}>
                    {isRegister && <label>Full Name<input name="name" type="text" autoComplete="name" placeholder="Your full name" minLength="2" maxLength="120" required /></label>}
                    {!isReset && <label>Email<input name="email" type="email" autoComplete="email" placeholder="you@example.com" required /></label>}
                    {(isLogin || isRegister || isReset) && <>
                        <label>Password<span className="password-wrap"><input name="password" type={showPassword ? 'text' : 'password'} autoComplete={isRegister || isReset ? 'new-password' : 'current-password'} placeholder="At least 8 characters" minLength={isLogin ? undefined : 8} onChange={(event) => setPassword(event.target.value)} required /><button type="button" className="password-toggle" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></span>{(isRegister || isReset) && <small className="password-hint">Use at least 8 characters.</small>}</label>
                        {(isRegister || isReset) && <label>Confirm Password<input name="confirm_password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" placeholder="Enter your password again" minLength="8" required /></label>}
                    </>}
                    {isLogin && <div className="auth-options"><label className="remember-option"><input type="checkbox" name="remember_me" /><span>Remember me</span></label><Link to="/forgot-password">Forgot password?</Link></div>}
                    {error && <p className="form-error" role="alert">{error}</p>}
                    <button className="button button-primary auth-submit" disabled={submitting}>{submitting ? 'Please wait…' : submitLabel} <ArrowRight size={16} /></button>
                </form>}
                {!success && <p className="auth-switch">{isLogin ? <>Don’t have an account? <Link to="/register">Create one</Link></> : isRegister ? <>Already have an account? <Link to="/login">Sign in</Link></> : <>Remembered your password? <Link to="/login">Sign in</Link></>}</p>}
                <div className="auth-security"><ShieldCheck size={16} /> Your documents are private to your account.</div>
            </div>
            <span className="auth-legal">ResearchVault AI <i>·</i> Turn research into answers.</span>
        </div>
        <aside className="auth-right"><div className="auth-art-glow" /><div className="auth-manifesto"><span className="section-kicker">A CLEARER VIEW OF WHAT YOU KNOW</span><h2>Good questions<br />deserve <em>good sources.</em></h2><p>Keep your research in reach, connect what matters, and trace every answer back to the page.</p></div><div className="auth-aside-bottom"><span><span className="footer-dot" /> PRIVATE BY DEFAULT</span><span>Research, with its sources.</span></div></aside>
    </main>
}
