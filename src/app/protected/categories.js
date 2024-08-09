import Image from "next/image";
import { useState } from "react";
import Cookies from "universal-cookie";
const cookies = new Cookies();
export default function Categories({cate, setCategory,setCatamount, setTransactions}) {
  const endpoints = [
    { url: "/api/category", setState: setCategory },
    { url: "/api/cattotal", setState: setCatamount },
    { url: "/api/transactions", setState: setTransactions },
   
  ];
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
  const [addcateg, setAddcateg] = useState(false);
  console.log("inside categories");
  const handleSubmit = async (event) => {
    event.preventDefault();
    const token = cookies.get("token");
    const formData = new FormData(event.target);
    const type = formData.get("type");
    const name = formData.get("name");
    const fill = formData.get("fill");
console.log(type, name,fill);

    //  console.log(description);
    const res = await fetch("/api/entercategory", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ type, name, fill }),
    });
    const { success, user } = await res.json();
    if (success) {
      alert("Inserted new transaction");
      getdata();
      setAddcateg(false);
    } else {
      alert("error inserting new transaction");
    }
  };
  const handleDelete = async (transid) => {
    const token = cookies.get("token");
    if (!token) {
      console.error("No token found. Please login first.");
      router.push("/");
      router.refresh();
      return;
    }
    const id = transid;

    //  console.log(description);
    const res = await fetch("/api/deletecategory", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ id }),
    });
    const { success, user } = await res.json();
    if (success) {
      getdata();
    } else {
      alert("error Deleting Data");
    }
  };
const handlecloseClick=()=>{
  setAddcateg(false);
}
  return (
    addcateg? 
    
    <div className="dashdata transdiv centerflex">
      {/* <h1 className="headname"> Add Transaction</h1> */}
      <button className="closebutt" onClick={handlecloseClick}>
        <Image alt="image" src="/close.png" width={24} height={24} />
      </button> 
      
     

      <div className="form">
        <form  className="submitform" onSubmit={handleSubmit}>
          <p className="loginhead"> Edit Transaction</p>
          <label className="submitlabel row">
            <div className="pad">
              <p>Type</p>
              <select id="type" name="type" >
                <option value="Debit">Debit</option>
                <option value="Credit">Credit</option>
              </select>
            </div>
            
          </label>
          <label className="submitlabel row">
            
            <div className="padd">
              <div>
                <p>Name</p>
                <input type="text" name="name"  placeholder="name"  />
              </div>
              <div>
                <p>Fill</p>
                <input type="color" name="fill"  placeholder="fill" />
              </div>
            </div>
          </label>

          <button type="number" className="loginbutton">
            Submit
          </button>
        </form>
      </div>
    </div>

    :
    <div className="dashdata transdiv">
      <h1>Categories</h1>
      <p className="subhead">Debit</p>
      <div className="categories light">
      {cate.filter(item => item.type === 'Debit').map((item, index) => (
  <div key={index} className="categitems">
    <Image alt="image" src={item.imgpath} width={40} height={40} />
    <button className="deletecat" onClick={() => handleDelete(item.categoryid)}>
      <Image alt="image" src="/delete2.png" width={12} height={12} />
    </button>
    <p>{item.name}</p>
  </div>
))}
        <div className="categitems" onClick={()=>{setAddcateg(true)}}>
          <Image alt="image" src="/plus.png" width={12} height={12} />
          <p></p>
        </div>
      </div>
      <p className="subhead">Credit</p>
      <div className="categories light">
      {cate.filter(item => item.type === 'Credit').map((item, index) => (
  <div key={index} className="categitems">
    <Image alt="image" src={item.imgpath} width={40} height={40} />
    <button className="deletecat" onClick={() => handleDelete(item.categoryid)}>
      <Image alt="image" src="/delete2.png" width={12} height={12} />
    </button>
    <p>{item.name}</p>
  </div>
))}
        
        <div className="categitems" onClick={()=>{setAddcateg(true)}}>
          <Image alt="image" src="/plus.png" width={12} height={12} />
          <p></p>
        </div>
      </div>
    </div>
  );
}
