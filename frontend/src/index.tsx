import * as React from "react";
import * as ReactDOM from "react-dom";
import { createStore, compose } from "redux";
import { Provider, useDispatch, useSelector } from "react-redux";
import { BrowserRouter, Route, Switch, useParams, Link, useLocation, Redirect } from "react-router-dom";
import { IState, Contest } from "./State";
import { ContestPlayersRetrievedAction } from "./actions/players/ContestPlayersRetrievedAction";
import { GamesRetrievedAction } from "./actions/games/GamesRetrievedAction";
import { RiggingTokenAcquired } from "./actions/rigging/RiggingTokenAcquired";
import { ContestSummary } from "./components/ContestSummary";
import { ContestList } from "./components/ContestList";
import Container from 'react-bootstrap/Container';
import * as styles from "./components/styles.sass";
import "./bootstrap.sass";
import { Rest } from "majsoul-api";
import { persistStore, persistReducer } from 'redux-persist'
import storage from 'redux-persist/lib/storage';
import { PersistGate } from 'redux-persist/integration/react'
import * as _ from "lodash";

import YouTube from 'react-youtube';
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import { toRecord } from "./components/utils";
import { ActionType, MajsoulAction } from "./actions";
import { RiggingLogin } from "./components/rigging/RiggingLogin";
import { fetchContestSummary } from "./api/Contests";
import { ContestSessions } from "./components/ContestSessions";
import { writeGoogleAuthCode } from "./api/Rigging";

import * as dayjs from "dayjs";
import * as relativeTime from "dayjs/plugin/relativeTime";
import * as utc from "dayjs/plugin/utc";
import * as timezone from "dayjs/plugin/timezone";
import * as calendar from "dayjs/plugin/calendar";
import * as duration from "dayjs/plugin/duration";
import * as localizedFormat from "dayjs/plugin/localizedFormat";
import * as localeData from "dayjs/plugin/localeData";
import * as updateLocale from "dayjs/plugin/updateLocale";
import * as advancedFormat from "dayjs/plugin/advancedFormat";
import "dayjs/locale/en";
import "dayjs/locale/en-nz";
import "dayjs/locale/en-ca";
import "dayjs/locale/en-au";
import "dayjs/locale/en-gb";
import "dayjs/locale/ru";
import "dayjs/locale/it";
import "dayjs/locale/fr";
import "dayjs/locale/fr-ca";
import "dayjs/locale/fi";
import "dayjs/locale/sv";
import "dayjs/locale/pt-br";
import "dayjs/locale/pt";
import "dayjs/locale/de";
import "dayjs/locale/tl-ph";
import "dayjs/locale/ja";
import "dayjs/locale/zh";
import "dayjs/locale/es";
import "dayjs/locale/nl";
import { withLocale } from "./api/utils";
dayjs.extend(advancedFormat);
dayjs.extend(relativeTime);
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(calendar);
dayjs.extend(duration);
dayjs.extend(localizedFormat);
dayjs.extend(localeData);
dayjs.extend(updateLocale);

let loc;
for (const locale of navigator.languages) {
	loc = locale.toLowerCase();
	if (loc === dayjs.locale(loc)) {
		break;
	}
}

if (loc === "en" && !dayjs.tz.guess().startsWith("America")) {
	loc = dayjs.locale("en-gb");
}

dayjs.updateLocale(loc, {
	calendar: {
		lastDay: withLocale("en", "[Yesterday at] LT"),
		sameDay: withLocale("en", "[Today at] LT"),
		nextDay: withLocale("en", "[Tomorrow at] LT"),
		lastWeek: withLocale("en", "[Last] dddd [at] LT"),
		nextWeek: withLocale("en", "dddd [at] LT"),
		sameElse: 'L'
	}
});

function updatedContestRecord(state: IState, contestId: string, contest: Partial<Contest>): {
	contestsById: Record<string, Contest>,
 } {
	const originalContest = state.contestsById[contestId] ?? {};

	return {
		contestsById: {
			...state.contestsById,
			[contestId]: {
				...originalContest,
				...contest,
			} as Contest
		}
	};
}

//todo: splatting some of these states is probably not correct and triggers changes.
function contestReducer(state: IState, action: MajsoulAction): IState {
	switch (action.type) {
		case ActionType.ContestSummaryRetrieved: {
			return _.merge(
				{},
				state,
				updatedContestRecord(state, action.contest._id, {
					...action.contest,
					teams: toRecord(action.contest.teams, "_id")
				})
			);
		} case ActionType.ContestImagesFetched: {
			return {
				...state,
				...updatedContestRecord(state, action.contest._id, {
					...action.contest,
					teams: toRecord(
						action.contest.teams?.map(team => ({
							...(state.contestsById[action.contest._id]?.teams[team._id] ?? {}),
							... {
								...team,
								image: team.image ?? null
							}
						})),
						"_id"
					)
				})
			};
		} case ActionType.GamesRetrieved: {
			const gamesRetrievedAction = action as GamesRetrievedAction;

			return {
				...state,
				games: {
					...(state.games ?? {}),
					...gamesRetrievedAction.games.reduce<Record<string, Rest.GameResult<string>>>(
						(record, next) => { record[next._id] = {
							...(state?.games?.[next._id] ?? {}),
							...next
						}; return record; }, {}
					)
				},
			}
		} case ActionType.RiggingTokenAcquired: {
			const riggingTokenGetAction = action as RiggingTokenAcquired;
			return {
				...state,
				user: {
					token: riggingTokenGetAction.token,
				}
			}
		} case ActionType.LoggedOut: {
			if (state.user) {
				return {...state, user: undefined};
			}
			break;
		} case ActionType.TeamPatched: {
			return {
				...state,
				...updatedContestRecord(state, action.contestId, {
					teams: {
						...state.contestsById[action.contestId].teams,
						...{ [action.team._id]: { ...action.team } }
					}
				})
			}
		} case ActionType.ContestSessionsRetrieved: {
			return {
				...state,
				...updatedContestRecord(
					state,
					action.contestId,
					{
						sessionsById: toRecord(action.sessions, "_id")
					}
				)
			}
		} case ActionType.SessionPatched: {
			return {
				...state,
				...updatedContestRecord(
					state,
					action.session.contestId,
					{
						sessionsById: {
							...(state.contestsById[action.session.contestId].sessionsById ?? {}),
							[action.session._id]: {
								...(state.contestsById[action.session.contestId].sessionsById[action.session._id] ?? {}),
								...action.session,
							}
						}
					}
				)
			}
		} case ActionType.ContestPlayersRetrieved: {
			const getContestPlayers = action as ContestPlayersRetrievedAction;
			return {
				...state,
				...updatedContestRecord(state, getContestPlayers.contestId, {
					players: getContestPlayers.players
				})
			}
		} case ActionType.ContestsIndexRetrieved: {
			return {
				...state,
				contestsById: {
					...state.contestsById,
					...toRecord(
						action.contests.map(contest => ({
							...contest,
							teams: toRecord(contest.teams, "_id"),
						} as Contest)),
						"_id"
					)
				}
			}
		} case ActionType.ContestPatched: {
			const originalContest = state.contestsById[action.contest._id];
			return {
				...state,
				...{
					contestsById: {
						...state.contestsById,
						[action.contest._id]: {
							...action.contest,
							teams: originalContest.teams,
							sessionsById: originalContest.sessionsById,
						}
					}
				}
			}
		} case ActionType.ContestCreated: {
			return {
				...state,
				...updatedContestRecord(state, action.contest._id, action.contest)
			}
		} case ActionType.TeamCreated: {
			return {
				...state,
				...updatedContestRecord(state, action.contestId, {
					teams: {
						...state.contestsById[action.contestId].teams,
						[action.team._id]: action.team
					}
				})
			}
		} case ActionType.TeamDeleted: {
			return {
				...state,
				...updatedContestRecord(state, action.contestId, {
					teams: toRecord(
						Object.values(state.contestsById[action.contestId].teams).filter(team => team._id !== action.teamId),
						"_id"
					)
				})
			}
		}
	}

	return state;
}

const composeEnhancers = (window as any).__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;

const store = createStore(
	persistReducer(
		{
			key: "root",
			storage,
			whitelist: ["user"]
		},
		contestReducer
	),
	{
		contestsById: {},
		musicPlayer: {
			playing: false,
			videoId: null
		},
	} as IState as any,
	composeEnhancers(),
)

const persistor = persistStore(store);

function ContestFromRoute(): JSX.Element {
	const { id } = useParams<{
		id: string;
	}>();
	return <ContestSummary contestId={id}/>
}

function LatestContestSummary(): JSX.Element {
	const dispatch = useDispatch();
	const [contestId, setContestId] = React.useState<string>();
	React.useEffect(() => {
		fetchContestSummary("featured").then(contest => {
			setContestId(contest._id);
		});
	}, [dispatch]);

	if (contestId == null) {
		return <div>Loading...</div>;
	}

	return <ContestSummary contestId={contestId}/>
}

function ContestSessionsFromRoute() {
	const { id } = useParams<{
		id: string;
	}>();
	return <ContestSessions contestId={id}/>
}

function GoogleAuthReceiver(): JSX.Element {
	const location = useLocation();
	const token = useSelector((state: IState) => state.user?.token);
	const params = new URLSearchParams(location.search);
	const code = params.get("code");
	React.useEffect(() => {
		if (token && code) {
			writeGoogleAuthCode(token, code);
		}
	}, [token, code]);
	return <Redirect to="/"/>
}

ReactDOM.render(
	<Provider store={store}>
		<PersistGate loading={null} persistor={persistor}>
			<BrowserRouter>
				<Container className={`${styles.feed} bg-dark px-5`}>
					<Container className={`${styles.feed} bg-primary px-3 pb-3`} style={{display:"flex", flexDirection:"column"}}>
						<Row className="no-gutters">
							<Switch>
								<Route path="/rigging/google">
									<GoogleAuthReceiver/>
								</Route>
								<Route path="/rigging">
									<RiggingLogin/>
								</Route>
								<Route path="/youtube">
									<YouTube videoId="Ag7W4SSl3fc" opts={{autoplay: 1} as any}></YouTube>
								</Route>
								<Route path="/contests/:id/sessions">
									<ContestSessionsFromRoute/>
								</Route>
								<Route path="/contests/:id">
									<ContestFromRoute/>
								</Route>
								<Route path="/contests">
									<ContestList/>
								</Route>
								<Route path="/">
									<LatestContestSummary/>
								</Route>
							</Switch>
						</Row>
						<Row style={{flex:"1"}}></Row>
						<Row className="mt-3 justify-content-center">
							<Col md="auto"><Link className="text-dark" to="/" >Home</Link></Col>
							<Col md="auto"><a className="text-dark" href="https://boards.4channel.org/vg/catalog#s=mjg">/mjg/</a></Col>
							<Col md="auto"><a className="text-dark" href="https://repo.riichi.moe/">Repo</a></Col>
							<Col md="auto"><a className="text-dark" href="https://github.com/riichinomics/majsoul-api">Source Code/Report Issue</a></Col>
							<Col md="auto"><Link className="text-dark" to="/contests" >Contests</Link></Col>
						</Row>
					</Container>
				</Container>
			</BrowserRouter>
		</PersistGate>
	</Provider>,
	document.getElementsByTagName("body")[0]
);
