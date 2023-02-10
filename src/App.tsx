import React, { useEffect, useRef, useState } from "react";
import "./App.css";
import { io } from "socket.io-client";

const socket = io("URL", {
	withCredentials: true,
	autoConnect: false,
});

function App() {
	const [page, setPage] = useState<"register" | "chat">("register");
	const [username, setUsername] = useState("");
	const [messages, setMessages] = useState<{ type: string; value: string }[]>(
		[]
	);
	const [messageInputValue, setMessageInputValue] = useState("");
	const ref = useRef<HTMLDivElement>(null);
	const [countUsers, setCountUsers] = useState(0);
	const [quit, setQuit] = useState(false);
	// 모든 유저(나 포함)
	const [allUsers, setAllUsers] = useState<
		{
			userID: string;
			username: string;
			self: boolean;
			connected?: boolean;
		}[]
	>([]);

	useEffect(() => {
		// debug용
		socket.onAny((event, ...args) => {
			console.log(event, args);
		});

		socket.on("connect", () => {
			if (socket.connected) {
				console.log("buffer", socket.receiveBuffer);
			}

			const c = allUsers;
			c.forEach((user) => {
				if (user.self) {
					user.connected = true;
				}
			});
			setAllUsers(c);
			console.log("socket connected", socket.id);
		});

		socket.on("connect_error", (err) => {
			if (err.message === "not authorized") {
				alert("닉네임이 등록되지 않아 등록 페이지로 이동합니다.");
				setPage("register");
			}
		});

		socket.on(
			"users",
			(users: { userID: string; username: string; self: boolean }[]) => {
				users.forEach((user) => {
					user.self = user.userID === socket.id;
				});

				// 최근 유저순, 이름순
				setAllUsers(
					users.sort((a, b) => {
						if (a.self) return -1;
						if (b.self) return 1;
						if (a.username < b.username) return -1;
						return a.username > b.username ? 1 : 0;
					})
				);
			}
		);

		socket.on("userConnected", (user) => {
			setAllUsers((prev) => [...prev, user]);
		});

		socket.on("disconnect", () => {
			console.log("socket is disconnected");
			setCountUsers(0);

			const c = allUsers;
			c.forEach((user) => {
				if (user.self) {
					user.connected = false;
				}
			});
			setAllUsers(c);
		});

		// 채팅 메시지
		socket.on("chatMessage", (msg) => {
			console.log("msg", msg);
			setMessages((prev) => [...prev, msg]);
		});

		// 생성된 소켓 인스턴스 수
		socket.on("usersCount", (usersLength) => {
			setCountUsers(usersLength);
		});

		return () => {
			socket.off("connect");
			socket.off("connect_error");
			socket.off("disconnect");
			socket.off("chatMessage");
			socket.off("usersCount");
		};
	}, []);

	// 채팅 시 스크롤 가장 아래로 포커싱
	useEffect(() => {
		ref.current?.scrollIntoView();
	}, [messages.length]);

	function handleRegisterSubmit() {
		if (username) {
			socket.auth = { username };
			socket.connect();

			return setPage("chat");
		}

		alert("돔황챠?!");
	}

	// chat page handling
	function handleChatSubmit(text: string) {
		socket.emit("chatMessage", { type: "text", value: text });
		setMessageInputValue("");
	}

	function handleFile(file: File | null) {
		console.log("file", file);
		if (file) {
			socket.emit("chatMessage", {
				type: "image",
				value: file,
			});
		}
	}

	function handleAlertEscape(type: "all" | "personal") {
		setMessages([]);

		if (type === "all") {
			socket.emit("banAllUsers", (response: { disconnect: any }) => {
				response.disconnect();
			});
		}

		if (type === "personal") {
			socket.disconnect();
			setQuit(true);
		}
	}

	return (
		<div className="App" style={{ minHeight: "100vh" }}>
			{page === "register" && (
				<form
					onSubmit={(e) => e.preventDefault()}
					style={{
						display: "flex",
						width: "100%",
						height: "100vh",
						flexDirection: "column",
						justifyContent: "center",
						alignItems: "center",
						gap: "10px",
					}}
				>
					<h1>커뮤니티 - 노비들</h1>
					<input
						type="text"
						style={{
							width: "200px",
							padding: "10px",
							borderRadius: 15,
							border: "1px solid black",
						}}
						placeholder="닉네임을 입력하면 잡으러 갑니다."
						value={username}
						onChange={(t) => {
							setUsername(t.target.value);
						}}
					/>
					<button
						type="submit"
						style={{
							border: "1px solid black",
							borderRadius: 15,
							padding: "5px 20px",
							cursor: "pointer",
						}}
						onClick={() => handleRegisterSubmit()}
					>
						도망쳐
					</button>
					<img
						width={300}
						height={200}
						style={{ objectFit: "contain" }}
						src="추노.jpeg"
						alt="저 놈 잡아라"
					/>
				</form>
			)}
			{page === "chat" && (
				<div>
					<header
						style={{
							display: "flex",
							flexDirection: "row",
							justifyContent: "center",
							alignItems: "center",
							gap: "10px",
						}}
					>
						<img
							width={150}
							height={150}
							src="pepe.png"
							alt="죽창 든 페페"
						/>
						<h1 style={{ color: "red" }}>🏴‍☠️성토장🏴‍☠️</h1>
						<img
							width={150}
							height={150}
							src="pepe.png"
							alt="죽창 든 페페"
						/>
					</header>
					<div
						style={{
							display: "flex",
							flexDirection: "row",
							justifyContent: "flex-end",
							alignItems: "center",
							gap: "10px",
						}}
					>
						<span>접속자수 {countUsers}</span>
						<div
							style={{
								display: "flex",
								flexDirection: "row",
								gap: "10px",
							}}
						>
							<button
								style={{
									cursor: "pointer",
									backgroundColor: "red",
									color: "white",
									border: "none",
									padding: "10px",
									borderRadius: "10px",
								}}
								onClick={() => handleAlertEscape("all")}
							>
								긴급 방깨기 장치(전체용)
							</button>
							<button
								style={{
									cursor: "pointer",
									backgroundColor: "red",
									color: "white",
									border: "none",
									padding: "10px",
									borderRadius: "10px",
								}}
								onClick={() => handleAlertEscape("personal")}
							>
								긴급 방깨기 장치(개인용)
							</button>
						</div>
					</div>
					<div>
						<ul
							id="screen"
							style={{
								listStyleType: "none",
								height: "600px",
								overflow: "auto",
							}}
						>
							{messages.map((message, idx) => (
								<li
									key={idx}
									className="list"
									style={{
										padding: "10px",
										textAlign: "left",
									}}
								>
									{message.type === "text" && (
										<p>
											{(socket.auth as any).username}:
											{message.value}
										</p>
									)}
									{message.type === "notice" && (
										<p style={{ textAlign: "center" }}>
											{message.value}
										</p>
									)}
									{message.type === "image" && (
										<div>
											<p>서경: </p>
											<img
												style={{ objectFit: "contain" }}
												width={200}
												height={200}
												src={`data:image/jpg;base64,${message.value}`}
												alt=""
											/>
										</div>
									)}
								</li>
							))}
							{quit && (
								<li>
									<p style={{ textAlign: "center" }}>
										방에서 나왔습니다.
									</p>
								</li>
							)}
							<div ref={ref} />
						</ul>
						<form
							style={{
								display: "flex",
								flexDirection: "column",
								gap: "30px",
							}}
							onSubmit={(e) => e.preventDefault()}
						>
							<div
								style={{
									flex: 1,
									display: "flex",
									padding: "0 10px",
									gap: "10px",
								}}
							>
								<input
									value={messageInputValue}
									placeholder="상소글 좀 올려라!!!"
									style={{ flex: 1, padding: "10px" }}
									onChange={(t) =>
										setMessageInputValue(t.target.value)
									}
								/>
								<button
									style={{
										padding: "10px",
										cursor: "pointer",
									}}
									type="submit"
									onClick={() =>
										handleChatSubmit(messageInputValue)
									}
								>
									보내기
								</button>
							</div>
							<div>
								<input
									type="file"
									onChange={(t) =>
										handleFile(
											t.target.files && t.target.files[0]
										)
									}
								/>
							</div>
						</form>
					</div>
				</div>
			)}
		</div>
	);
}

export default App;
