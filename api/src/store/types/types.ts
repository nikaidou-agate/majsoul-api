import * as majsoul from "../../majsoul";
import { Credentials as GoogleCredentials } from 'google-auth-library';

export interface GameResult<Id = any> extends Omit<Partial<majsoul.GameResult>, "players"> {
	_id: Id;
	contestId: Id;
	players?: Player<Id>[];
	notFoundOnMajsoul?: boolean;
}

export interface Session<Id = any> {
	name?: string;
	_id: Id;
	contestId: Id;
	scheduledTime: number;
	plannedMatches: Match<Id>[];
	isCancelled?: boolean;
}

export interface Player<Id = any> extends Partial<majsoul.Player> {
	_id: Id;
	majsoulFriendlyId?: number;
	displayName?: string;
}

export enum ContestType {
	Tourney,
	League,
}

export interface Contest<Id = any> extends Partial<majsoul.Contest> {
	type?: ContestType;
	_id: Id;
	teams?: ContestTeam<Id>[];
	anthem?: string;
	tagline?: string;
	taglineAlternate?: string;
	maxGames?: number;
	displayName?: string;
	notFoundOnMajsoul?: boolean;
	bonusPerGame?: number;
	track?: boolean;
	spreadsheetId?: string;
}

export interface ContestTeam<Id = any> {
	_id: Id;
	name?: string;
	image?: string;
	players?: Player<Id>[];
	color?: string;
	anthem?: string;
}

export interface MatchTeam<Id = any> {
	_id: Id;
}

export interface Match<Id = any> {
	teams: MatchTeam<Id>[];
}

export interface User<Id = any> {
	_id: Id;
	nickname: string;
	password: {
		salt: string;
		hash: string;
	};
	scopes: string[];
}

export interface Config<Id = any> {
	_id: Id;
	featuredContest?: Id;
	googleRefreshToken?: string;
}
