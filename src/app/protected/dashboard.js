"use client";
import DatePicker from "react-datepicker";
import Image from "next/image";
import Areac from "./areachart";
import Piec from "./piechart";
import { memo, useState, useDeferredValue, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Cookies from "universal-cookie";
import "react-datepicker/dist/react-datepicker.css";

const cookies = new Cookies();
const Dashboard = memo(function Dashboard(props) {
  const endpoints = [
    { url: "/api/cattotal", setState: props.setCatamount },
    { url: "/api/creditdebit", setState: props.setCreditdebit },
    { url: "/api/transtable", setState: props.setTranstable },
  ];

  const deferredQuery = useDeferredValue(props.user[0]);

  const router = useRouter();

  const handleClearCookies = () => {
    const cookies = new Cookies();

    // Get all cookies
    const allCookies = cookies.getAll();

    // Clear all cookies
    for (const cookie in allCookies) {
      cookies.remove(cookie, { path: "/" });
    }

    // Redirect to the new page
    router.push("/"); // replace '/new-page' with your target path
  };
  //console.log("inside dashboard");
  const getDateRange = (data) => {
    const result = { min: null, max: null };

    data.forEach((entry) => {
      const entryDate = new Date(entry.date);
      if (!result.min || entryDate < result.min) result.min = entryDate;
      if (!result.max || entryDate > result.max) result.max = entryDate;
    });

    

    return result; // You can remove this line if you don't want to return anything
  };

  const result = getDateRange(props.transtables);

  const [StartDate, setStartDate] = useState(null);
  const [EndDate, setEndDate] = useState(null);
  const hasInitialized = useRef(false);
  // Get today's date
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  // Format the startOfMonth date to YYYY-MM-DD
  const year = startOfMonth.getFullYear();
  const month = String(startOfMonth.getMonth() + 1).padStart(2, '0'); // Add 1 since months are 0-based
  const day = String(startOfMonth.getDate()).padStart(2, '0');

  const formattedStartOfMonth = `${year}-${month}-${day}`;
  useEffect(() => {
    if (props.transtables && !hasInitialized.current) {
      if (result.min) {
        // setStartDate(result.min.toISOString());
        // //console.log(formattedStartOfMonth+"+++++++++++++++++");
        setStartDate(formattedStartOfMonth);
        hasInitialized.current = true;
      }
      if (result.max) {
        const maxDate = new Date(result.max); // Convert result.max (ISO string) to a Date object

        // Compare the dates by their time values
        const biggerDate =
          today.getTime() > maxDate.getTime() ? today : maxDate;
        // setEndDate(result.max.toISOString());
        setEndDate(biggerDate.toISOString().split('T')[0]);
        hasInitialized.current = true;
      }
      
    }
  }, [props.transtables, result]); // Runs when `transtables` changes

  useEffect(() => {
    if (EndDate != null && StartDate != null) {

      // //console.log(StartDate+"*********"+EndDate);
      // //console.log("runnging");
      const token = cookies.get("token");

      if (!token) {
        console.error("No token found. Please login first.");
        router.push("/");
        router.refresh();
        return;
      }

      endpoints.forEach(({ url, setState }) => {
        fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            StartDate: StartDate, // Assuming you have the StartDate variable available
            EndDate: EndDate, // Assuming you have the EndDate variable available
          }),
        })
          .then((res) => res.json())
          .then((data) => setState(data))
          .catch((error) => {
            console.error(`Error fetching data from ${url}:`, error);
          });
      });
    }
  }, [StartDate, EndDate]);
  return (
    <div className="data">
      <div className="dashdata">
        <h1 className="headname marg">Dashboard</h1>
        <p className="subhead">Analysis</p>
        {/* <p className="move">Fliter</p> */}
        <div className="date ">
          <div className="date">
            <p>From:</p>
            <DatePicker
              selected={StartDate}
              onChange={(date) => setStartDate(date)}
              dateFormat="yyyy-MM-dd"
              // isClearable
              placeholderText="Start"
            />
          </div>
          <div className="date">
            <p>To:</p>
            <DatePicker
              selected={EndDate}
              onChange={(date) => setEndDate(date)}
              dateFormat="yyyy-MM-dd"
              // isClearable
              placeholderText="End"
            />
          </div>
        </div>
        <div className="graph maingraph">
          <div className="graphs areachart">
            <Areac transtables={props.transtables} />
          </div>
          <div className="graphs piechart">
            <Piec catamount={props.catamount} />
          </div>
        </div>
        <div className="place">
          <p className="subhead">Account Overview</p>
          <div className="graph equalspace">
            <div className="info light">
              <p>Credit</p>
              <p className="amount green">
                <span>₹</span>
                {props.creditdebit
                  .filter((item) => item["type"] === "Credit")
                  .reduce((total, item) => total + item["amount"], 0)
                  .toFixed(3)}
              </p>
            </div>
            <div className="info light">
              <p>Debit</p>
              <p className="amount red">
                <span>₹</span>
                {props.creditdebit
                  .filter((item) => item["type"] === "Debit")
                  .reduce((total, item) => total + item["amount"], 0)
                  .toFixed(3)}
              </p>
            </div>
            <div className="info light">
              <p>Saving</p>
              <p className="amount yellow">
                <span>₹</span>
                {props.creditdebit
                  .reduce((total, item) => {
                    if (item["type"] === "Credit")
                      return total + item["amount"];
                    if (item["type"] === "Debit") return total - item["amount"];
                    return total;
                  }, 0)
                  .toFixed(3)}
              </p>
            </div>
          </div>
        </div>
      </div>
      <div className="profile">
        <h1 className="headname">Profile</h1>
        <div className="profiledata">
          <Image
            alt="image"
            // src={deferredQuery?deferredQuery.image:"/profile.png"}
            src={`http://127.0.0.1:3000/api/get-uploaded-file?file=${encodeURIComponent(
              deferredQuery ? deferredQuery.image : "/profile.png"
            )}`}
            height={100}
            width={100}
            className="profimg"
          />
          <p>{props.user[0] ? props.user[0]["name"] : " "}</p>
          <div className="edit">
            <button
              className="profeditbutton"
              onClick={() => props.setActiveComponent("component4")}
            >
              <Image alt="image" src="/edit.png" width={25} height={25} />
            </button>
            {/* <button className="profeditbutton">
              <Image alt="image" src="/notification.png" width={25} height={25} />
            </button> */}
            <button className="profeditbutton" onClick={handleClearCookies}>
              <Image alt="image" src="/logout.png" width={20} height={20} />
            </button>
          </div>
        </div>
        <div className="profsubhead">
          <p className="headname margin">Transfers</p>
          <p
            className="seemore"
            onClick={() => {
              props.setActiveComponent("component2");
            }}
          >
            see more
          </p>
        </div>
        <div className="tabledb light">
          <table>
            <tbody>
              {props.trans.slice(0, 5).map((item, index) => (
                <tr key={index}>
                  <td>{item.type}</td>
                  <td>{item.date}</td>
                  <td>
                    <span>₹</span>
                    {item.amount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="catname">
          <div className="profsubhead">
            <p className="headname margin">Categories</p>
            <p
              className="seemore"
              onClick={() => {
                props.setActiveComponent("component3");
              }}
            >
              see more
            </p>
          </div>
          <div className="categ light">
            {props.cate.slice(0, 3).map((item, index) => (
              <div className="categbox" key={index}>
                {item.name}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});

export default Dashboard;
