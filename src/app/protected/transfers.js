"use client";
import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import ReactMarkdown from "react-markdown";

import Cookies from "universal-cookie";
const cookies = new Cookies();
export default function Transfers(props) {
  console.log("inside transfer");
  const hasFetchedData = useRef(false);
  const [markdown, setMarkdown] = useState("fetching data");
  const [addbutton, setAddbutton] = useState(false);
  const [addedit, setAddedit] = useState(false);
  const [selectedType, setSelectedType] = useState("Debit");
  const [edittrans, setEdittrans] = useState();
  const [userdata, setUserdata] = useState();
  const [inputValue, setInputValue] = useState('hello');
  const[type, setType]= useState();
  const[category, setCategory]= useState();
  const[description, setDescription]= useState();
  const[date, setDate]= useState();
  const[amount, setAmount]= useState();

  const hType = (event) => {
    setSelectedType(event.target.value);
    setType(event.target.value);
  };
  const hCateg = (event) => {
    
    setCategory(event.target.value);
  };
  const hDesc = (event) => {
    
    setDescription(event.target.value);
  };
  const hDate = (event) => {
    
    setDate(event.target.value);
  };
  const hAmount = (event) => {
    
    setAmount(event.target.value);
  };
  useEffect(() =>
    {
   if(userdata){
    setType(userdata.type);
    setCategory(userdata.category);
    setDescription(userdata.description);
    setDate(userdata.date);
    setAmount(userdata.amount);
    // console.log(userdata.transid)
   }
    }
    ,[userdata])
  useEffect(() => {
    async function gettransdata(token) {
      //  console.log(description);
      const res = await fetch("/api/pertransdata", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ edittrans }),
      });
      const data = await res.json();
      setUserdata(data.result[0]);
      
      
      setEdittrans(null);
    }
    if (edittrans) {
     
      const token = cookies.get("token");

      if (!token) {
        console.error("No token found. Please login first.");
        router.push("/");
        router.refresh();
        return;
      }
      gettransdata(token);
      return()=>{
        console.log(userdata);
  
      }
    }
  }, [edittrans]);

  const getperdata = (id) =>{

    setEdittrans(id)
    setAddedit(true);
    // console.log(userdata);
  }
  const handleChange = (event) => {
    setSelectedType(event.target.value);
  };

  useEffect(() => {
    if (hasFetchedData.current) {
      return;
    }

    hasFetchedData.current = true;
    // console.log("I am here");
    const token = cookies.get("token");

    if (!token) {
      console.error("No token found. Please login first.");
      return;
    }

    fetch("/api/ai", {
      method: "GET",
      headers: {
        "Content-Type": "application/json", // Set the request headers to indicate JSON format
        Authorization: `Bearer ${token}`, // Include the JWT token in the Authorization header
      },
    })
      .then((res) => res.json()) // Parse the response data as JSON
      .then((data) => setMarkdown(data)) // Update the state with the fetched data

      .catch((error) => console.error("Error fetching data:", error));
  }, []);

  const endpoints = [
    { url: "/api/transactions", setState: props.settrans },
    { url: "/api/creditdebit", setState: props.setcreditdebit },
    { url: "/api/cattotal", setState: props.setCatamount },
    { url: "/api/transtable", setState: props.setTranstable },
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
  const handleSubmit = async (event) => {
    event.preventDefault();
    const token = cookies.get("token");
    const formData = new FormData(event.target);
    const type = formData.get("type");
    const category = formData.get("category");
    const description = formData.get("description");
    const date = formData.get("date");
    const amount = formData.get("amount");

    //  console.log(description);
    const res = await fetch("/api/entertransaction", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ type, category, description, date, amount }),
    });
    const { success, user } = await res.json();
    if (success) {
      alert("Inserted new transaction");
      getdata();
      setAddbutton(false);
    } else {
      alert("error inserting new transaction");
    }
  };

  const handleEdit = async (event) => {
    event.preventDefault();
    const token = cookies.get("token");
    const formData = new FormData(event.target);
    const type = formData.get("type");
    const category = formData.get("category");
    const description = formData.get("description");
    const date = formData.get("date");
    const amount = formData.get("amount");
    const id = userdata.transid;
    //  console.log(description);
    const res = await fetch("/api/edittransaction", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ id, type, category, description, date, amount }),
    });
    const { success, user } = await res.json();
    if (success) {
      alert("Inserted new transaction");
      getdata();
      setAddedit(false);
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
    const res = await fetch("/api/deletetransaction", {
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
  const handleAddClick = () => {
    setAddbutton(true);
  };

  const handlecloseClick = () => {
    setAddbutton(false);
    setAddedit(false);
  };
  return addbutton ? (
    <div className="dashdata transdiv centerflex">
      {/* <h1 className="headname"> Add Transaction</h1> */}
      <button className="closebutt" onClick={handlecloseClick}>
        <Image alt="image" src="/close.png" width={24} height={24} />
      </button>

      <div className="form">
        <form onSubmit={handleSubmit} className="submitform">
          <p className="loginhead">Transaction</p>
          <label className="submitlabel row">
            <div className="pad">
              <p>Type</p>
              <select id="type" name="type" onChange={handleChange}>
                <option value="Debit">Debit</option>
                <option value="Credit">Credit</option>
              </select>
            </div>
            <div className="pad">
              <p>Category</p>
              <select id="type" name="category">
                {props.cate
                  .filter((item) => item.type === selectedType)
                  .map((item, index) => (
                    <option key={index} value={item.name}>
                      {item.name}
                    </option>
                  ))}
              </select>
            </div>
          </label>
          <label className="submitlabel row">
            <div className="padd">
              <p>Description</p>
              <textarea
                name="description"
                rows="5"
                cols="25"
                // value={inputValue} onChange={hChange}
                placeholder="description"
              ></textarea>
            </div>
            <div className="padd">
              <div>
                <p>Date</p>
                <input type="date" name="date" placeholder="date" />
              </div>
              <div>
                <p>Amount</p>
                <input type="text" name="amount"  placeholder="amount" />
              </div>
            </div>
          </label>

          <button type="number" className="loginbutton">
            Submit
          </button>
        </form>
      </div>
    </div>
  ) : addedit ? 
  (
    <div className="dashdata transdiv centerflex">
      {/* <h1 className="headname"> Add Transaction</h1> */}
      <button className="closebutt" onClick={handlecloseClick}>
        <Image alt="image" src="/close.png" width={24} height={24} />
      </button>

      <div className="form">
        <form onSubmit={handleEdit} className="submitform">
          <p className="loginhead"> Edit Transaction</p>
          <label className="submitlabel row">
            <div className="pad">
              <p>Type</p>
              <select id="type" name="type" value={type?type:null} onChange={hType}>
                <option value="Debit">Debit</option>
                <option value="Credit">Credit</option>
              </select>
            </div>
            <div className="pad">
              <p>Category</p>
              <select id="type" name="category" value={category?category:null} onChange={hCateg}>
                {props.cate
                  .filter((item) => item.type === selectedType)
                  .map((item, index) => (
                    <option key={index} value={item.name}>
                      {item.name}
                    </option>
                  ))}
              </select>
            </div>
          </label>
          <label className="submitlabel row">
            <div className="padd">
              <p>Description</p>
              <textarea
                name="description"
                rows="5"
                cols="25"
                value={description?description:null}
                onChange={hDesc}
                // value={inputValue} onChange={hChange}
                placeholder="description"
              ></textarea>
            </div>
            <div className="padd">
              <div>
                <p>Date</p>
                <input type="date" name="date" value={date?date:null} placeholder="date" onChange={hDate} />
              </div>
              <div>
                <p>Amount</p>
                <input type="text" name="amount" value={amount?amount:null} placeholder="amount"  onChange={hAmount}/>
              </div>
            </div>
          </label>

          <button type="number" className="loginbutton">
            Submit
          </button>
        </form>
      </div>
    </div>
  )
  :(
    <div className="dashdata transdiv">
      <h1 className="headname">Transfers</h1>
      <button className="addbutt" onClick={handleAddClick}>
        Add <Image alt="image" src="/plus.png" width={12} height={12} />
      </button>
      <div className="tableenclosure">
        <table>
          <tbody>
            <tr>
              <th className="th thsticky">ID</th>
              <th className="th thsticky">TYPE</th>
              <th className="th thsticky">Category</th>
              <th className="th thsticky">DESCRIPTION</th>
              <th className="th thsticky">AMOUNT</th>
              <th className="th thsticky">DATE</th>
              <th className="th thsticky">EDIT</th>
            </tr>
            {props.trans.map((item, index) => (
              <tr className="light" key={index}>
                <td className="th">{item.transid}</td>
                <td className="th">{item.type}</td>
                <td className="th">{item.category}</td>
                <td className="th">
                  <div class="cell-container">{item.description}</div>
                </td>
                <td className="th">
                  <span>₹</span>
                  {item.amount}
                </td>
                <td className="th">{item.date}</td>
                <td className="th">
                  <div className="editbutton">
                    <button className="transbutton" onClick={()=>getperdata(item.transid)}>
                      <Image
                        alt="image"
                        src="/edit.png"
                        width={20}
                        height={20}
                      />
                      {/* Edit */}
                    </button>
                    <button
                      className="transbutton"
                      onClick={() => handleDelete(item.transid)}
                    >
                      <Image
                        alt="image"
                        src="/delete.png"
                        width={20}
                        height={20}
                      />
                      {/* Delete */}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="aigen">
        <p className="subhead">AI Insights</p>
        <button className="bottombutt">
          Regenerate{" "}
          <Image alt="image" src="/reload.png" width={15} height={15} />
        </button>
        <div className="aigenerated light">
          <div>
            <ReactMarkdown>{markdown}</ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
}
