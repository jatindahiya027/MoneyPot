import { memo } from "react";
import Image from "next/image";
import Cookies from "universal-cookie";
import { useState, useDeferredValue } from "react";
import { useRouter } from "next/navigation";
import ImageUpload from "./ImageUpload";
const cookies = new Cookies();
const Setting = memo(function Setting({ user, setUser }) {
  const router = useRouter();
  const [file, setFile] = useState(null);
  const deferredQuery = useDeferredValue(user[0]);
  const [name, setName] = useState(deferredQuery ? deferredQuery.name : "null");
  const [age, setAge] = useState(deferredQuery ? deferredQuery.age : "null");
  const [mail, setMail] = useState(deferredQuery ? deferredQuery.mail : "null");
  const [image, setImage] = useState(
    deferredQuery ? deferredQuery.image : "/profile.png"
  );
  const [page, setPage] = useState("page0");

  const endpoints = [{ url: "/api/get", setState: setUser }];
  const getdata = () => {
    const token = cookies.get("token");

    if (!token) {
      console.error("No token found. Please login first.");
      router.push("/");
      router.refresh();
      return;
    }

    endpoints.forEach(({ url, setState }) => {
      fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      })
        .then((res) => res.json())
        .then((data) => setState(data))
        .catch((error) => {
          console.error(`Error fetching data from ${url}:`, error);
        });
    });
  };
  const updateName = (event) => {
    setName(event.target.value);
  };
  const updateAge = (event) => {
    setAge(event.target.value);
  };
  const updateMail = (event) => {
    setMail(event.target.value);
  };
  const handleChange = (e) => {
   
    setFile(e.target.files[0]);
    // if (e.target.files[0]) {
    //   const imageUrl = URL.createObjectURL(e.target.files[0]);
    //   setImage(imageUrl);
    // }
    // //console.log(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    const token = cookies.get("token");

    if (!token) {
      console.error("No token found. Please login first.");
      router.push("/");
      router.refresh();
      return;
    }
    e.preventDefault();
    const formData = new FormData(e.target);
    const name = formData.get("name");
    const age = formData.get("age");
    const mail = formData.get("email");

    // const password = formData.get("password");

    if (file != null) {
      // //console.log("file was there.")
      formData.append("file", file);
      // //console.log(file.name);
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        //console.log("Image uploaded successfully!");
        const result = await res.json();
        setImage(result.Message);
        const img = result.Message;
        const ress = await fetch("/api/edituser", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ name, age, mail, img }),
        });
        const { success, user } = await ress.json();
        if (success) {
          getdata();
        } else {
          alert("error inserting new transaction");
        }
      } else {
        console.error("Image upload failed.");
      }
    } else {
      const img = image;
      const res = await fetch("/api/edituser", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, age, mail, img }),
      });
      const { success, user } = await res.json();
      if (success) {
        // alert("Inserted new transaction");
        getdata();
      } else {
        alert("error inserting new transaction");
      }
    }
  };

  
  const downloadCSV = async () => {
    const token = cookies.get("token");

    if (!token) {
      console.error("No token found. Please login first.");
      router.push("/");
      router.refresh();
      return;
    }

    const response = await fetch("/api/export", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "transactions.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };
  return (
    <div className="dashdata transdiv">
      <h1 className="headname"> Setting</h1>
      <div className="settingdiv">
        <div className="settigndivheading">
          <button
            className={`button ${page === "page0" ? "active" : ""}`}
            onClick={() => setPage("page0")}
          >
            <Image alt="image" src="/rof.png" height={20} width={20} />
            <p> Profile</p>
          </button>
          {/* <button className="button ">
            <Image alt="image" src="/pie-chart.png" height={20} width={20} />
            <p> Budget</p>
          </button> */}
          <button
            className={`button ${page === "page1" ? "active" : ""}`}
            onClick={() => setPage("page1")}
          >
            <Image alt="image" src="/export.png" height={20} width={20} />
            <p> Export</p>
          </button>
        </div>
        <div>
          <div>
            {page == "page1" ? (
              <>
                <h1 className="headname orr">Export Your Data to CSV</h1>
                <p className="para">
                  Easily download your data in CSV format for further analysis
                  or record-keeping.
                </p>
                <button onClick={downloadCSV} className="buttonflex">
                  <Image
                    alt="dwd"
                    src="/downloads.png"
                    width={20}
                    height={20}
                  />
                  Download CSV
                </button>
              </>
            ) : null}
            {page == "page0" ? (
              <div className="formsett">
                <form onSubmit={handleSubmit}>
                  {/* <p className="loginhead">SignUp</p> */}
                  <div className="formsettt">
                    <Image
                      alt="Profile Image"
                      // src={image ? image : "/rof.png"}
                      src={`http://127.0.0.1:3000/api/get-uploaded-file?file=${encodeURIComponent(image ? image : "/rof.png")}`}
                      width={120}
                      height={120}
                      style={{ borderRadius: "50%", marginBottom: "15px" }}
                    />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleChange}
                    />
                  </div>
                  <p>Name</p>
                  <label className="label">
                    <Image alt="image" src="/user.png" height={30} width={30} />
                    <input
                      type="text"
                      name="name"
                      value={name}
                      onChange={updateName}
                    />
                  </label>
                  <p>Age</p>
                  <label className="label">
                    <Image alt="image" src="/age.png" height={30} width={30} />
                    <input
                      type="text"
                      name="age"
                      value={age}
                      onChange={updateAge}
                    />
                  </label>
                  <p>E-mail</p>
                  <label className="label">
                    <Image
                      alt="image"
                      src="/email.png"
                      height={30}
                      width={30}
                    />
                    <input
                      type="text"
                      name="email"
                      value={mail}
                      onChange={updateMail}
                    />
                  </label>

                  <button type="submit" className="loginbutton">
                    Update
                  </button>
                </form>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
});

export default Setting;
