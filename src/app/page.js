"use client" ;
import { useRouter } from "next/navigation";
import Image from "next/image";
export default function Home() {
  const router = useRouter();
  const handleSubmit = async (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    const username = formData.get("username");
    const password = formData.get("password");
    const res = await fetch("/api/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    const { success } = await res.json();
    if (success) {
      router.push("/protected");
      router.refresh();
    } else {
      alert("Login failed");
    }
  };
  return (
    <div className="login">
      <form onSubmit={handleSubmit} className="loginform">
        <p className="loginhead">Login</p>
        <label className="label">
          <Image alt="image" src="/email.png" height={30} width={30} />
          <input type="text" name="username" placeholder="Mail" />
        </label>
        <label className="label">
          <Image alt="image" src="/padlock.png" height={30} width={30} />
          <input type="password" name="password" placeholder="Password" />
        </label>
        <button type="submit" className="submitbutton">
          Submit
        </button>
      </form>
    </div>
  );
}
