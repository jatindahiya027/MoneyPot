"use client" ;
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function Signup() {
  const router = useRouter();


  const handleSubmit = async (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    const username = formData.get("name");
    const age = formData.get("age");
    const email = formData.get("email");
    const password = formData.get("password");
    const res = await fetch("/api/signup", {
      method: "POST",
      body: JSON.stringify({ username, age, email, password }),
    });
    const { success,user } = await res.json();
    if (success) {
        alert("SignUp Success");
      router.push("/");
      router.refresh();
    } else {
      if(user){
       //console.log(user);
       alert(user)
      }

    }
  };

  return (
    <div className="login">
      <form onSubmit={handleSubmit} className="loginform">
        <p className="loginhead">SignUp</p>
        <label className="label">
          <Image alt="image" src="/user.png" height={30} width={30} />
          <input type="text" name="name" placeholder="Name" />
        </label>
        <label className="label">
          <Image alt="image" src="/age.png" height={30} width={30} />
          <input type="text" name="age" placeholder="Age" />
        </label>
        <label className="label">
          <Image alt="image" src="/email.png" height={30} width={30} />
          <input type="text" name="email" placeholder="Email" />
        </label>
        <label className="label">
          <Image alt="image" src="/padlock.png" height={30} width={30} />
          <input type="password" name="password" placeholder="Password" />
        </label>
        <button type="submit" className="loginbutton">
          SignUp
        </button>
      
      </form>
    </div>
  );
}
