import React from 'react'
import { SignIn } from '@clerk/nextjs'
const SignInPage = () => {
  return (
    <div className='flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black'>
        <SignIn />
    </div>
  )
}

export default SignInPage
