'use client'

import { SignUp } from '@clerk/nextjs'

export default function SignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#2D3748] px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-[#1A202C]/80 backdrop-blur-sm rounded-3xl p-10 shadow-xl border border-[#E8D5B7]/20">
          <SignUp 
            routing="hash" 
            signInUrl="/login" 
            afterSignUpUrl="/profile"
            appearance={{
              elements: {
                rootBox: { 
                  margin: "0 auto",
                  width: "100%",
                  border: "none",
                  boxShadow: "none",
                  backgroundColor: "transparent"
                },
                card: { 
                  backgroundColor: "transparent",
                  boxShadow: "none",
                  border: "none",
                  borderWidth: "0",
                  width: "100%",
                  padding: "0",
                  outline: "none"
                },
                main: {
                  width: "100%",
                  border: "none",
                  boxShadow: "none",
                  backgroundColor: "transparent"
                },
                headerTitle: { color: "#E8D5B7" },
                headerSubtitle: { color: "rgba(232, 213, 183, 0.7)" },
                socialButtonsBlockButton: {
                  backgroundColor: "#2D3748",
                  borderColor: "rgba(232, 213, 183, 0.3)",
                  color: "#E8D5B7"
                },
                formButtonPrimary: {
                  backgroundColor: "#E8D5B7",
                  color: "#2D3748"
                },
                formFieldInput: {
                  backgroundColor: "#2D3748",
                  borderColor: "rgba(232, 213, 183, 0.3)",
                  color: "#E8D5B7"
                },
                formFieldLabel: { color: "rgba(232, 213, 183, 0.7)" },
                footerActionLink: { color: "#E8D5B7" },
                identityPreviewText: { color: "#E8D5B7" },
                identityPreviewEditButton: { color: "#E8D5B7" },
                formResendCodeLink: { color: "#E8D5B7" },
                dividerLine: { backgroundColor: "rgba(232, 213, 183, 0.2)" },
                dividerText: { color: "rgba(232, 213, 183, 0.7)" },
                alertText: { color: "#E8D5B7" },
                formFieldErrorText: { color: "#EF4444" },
                footerAction: { color: "rgba(232, 213, 183, 0.7)" },
              },
              variables: {
                colorPrimary: "#E8D5B7",
                colorBackground: "#1A202C",
                colorInputBackground: "#2D3748",
                colorInputText: "#E8D5B7",
                colorText: "#E8D5B7",
                colorTextSecondary: "rgba(232, 213, 183, 0.7)",
                colorDanger: "#EF4444",
                borderRadius: "1rem",
              }
            }}
          />
        </div>
      </div>
    </div>
  )
}
