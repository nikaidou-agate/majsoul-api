import * as majsoul from "../../majsoul";

export interface GameResult<Id = any> extends Partial<majsoul.GameResult> {
	_id: Id;
	contestId: Id;
	players?: Player<Id>[];
	notFoundOnMajsoul?: boolean;
}

export interface Session<Id = any> {
	_id: Id;
	contestId: Id;
	scheduledTime: number;
	plannedMatches: Match<Id>[];
	isCancelled: boolean;
}

export interface Player<Id = any> extends majsoul.Player {
	_id: Id;
	displayName: string;
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
}

export interface ContestTeam<Id = any> {
	_id: Id;
	name: string;
	image: string;
	players: Player<Id>[];
	color: string;
	anthem: string;
}

export interface Match<Id = any> {
	teams: {
		_id: Id;
	}[];
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
}
