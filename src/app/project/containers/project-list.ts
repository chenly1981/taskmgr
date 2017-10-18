import {Component, HostBinding, ChangeDetectionStrategy} from '@angular/core';
import {MatDialog} from '@angular/material';
import {Store} from '@ngrx/store';
import {Observable} from 'rxjs/Observable';
import * as fromRoot from '../../reducers';
import * as actions from '../../actions/project.action';
import {NewProjectComponent} from '../components/new-project';
import {InviteComponent} from '../components/invite';
import {ConfirmDialogComponent} from '../../shared';
import {defaultRouteAnim, listAnimation} from '../../anim';
import { Project, User } from '../../domain';

@Component({
  selector: 'app-project-list',
  template: `
    <div fxLayout="row" fxLayoutWrap [@listAnim]="listAnim$ | async">
      <app-project-item
        fxFlex="0 0 360px"
        fxFlex.xs="1 1 auto"
        fxLayout="row"
        class="card"
        *ngFor="let project of (projects$ | async)"
        [item]="project"
        (itemSelected)="selectProject(project)"
        (launchUpdateDialog)="openUpdateDialog(project)"
        (launchInviteDailog)="openInviteDialog(project)"
        (launchDeleteDailog)="openDeleteDialog(project)">
      </app-project-item>
    </div>
    <button mat-fab (click)="openNewProjectDialog()" type="button" class="fab-button">
      <mat-icon>add</mat-icon>
    </button>
  `,
  styles: [`
    .card {
      margin: 10px;
    }
    .fab-button {
      position: fixed;
      right: 32px;
      bottom: 96px;
      z-index: 998;
    }
  `],
  animations: [defaultRouteAnim, listAnimation],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProjectListComponent {

  @HostBinding('@routeAnim') state: string;
  projects$: Observable<Project[]>;
  listAnim$: Observable<number>;

  constructor(private store$: Store<fromRoot.State>,
              private dialog: MatDialog) {
    this.store$.dispatch(new actions.LoadProjectsAction());
    this.projects$ = this.store$.select(fromRoot.getProjects);
    this.listAnim$ = this.projects$.map(p => p.length);
  }

  selectProject(project: Project) {
    this.store$.dispatch(new actions.SelectProjectAction(project));
  }

  openNewProjectDialog() {
    const img = `/assets/img/covers/${Math.floor(Math.random() * 40)}_tn.jpg`;
    const thumbnails$ = this.getThumbnailsObs();
    const dialogRef = this.dialog.open(NewProjectComponent, {data: { thumbnails: thumbnails$, img: img}});
    dialogRef.afterClosed().take(1).subscribe(val => {
      if (val) {
        const converImg = this.buildImgSrc(val.coverImg);
        this.store$.dispatch(new actions.AddProjectAction({...val, coverImg: converImg}));
      }
    });
  }

  openUpdateDialog(project: Project) {
    const thumbnails$ = this.getThumbnailsObs();
    const dialogRef = this.dialog.open(NewProjectComponent, {data: { project: project, thumbnails: thumbnails$}});
    dialogRef.afterClosed().take(1).subscribe(val => {
      if (val) {
        const converImg = this.buildImgSrc(val.coverImg);
        this.store$.dispatch(new actions.UpdateProjectAction({...val, id: project.id, coverImg: converImg}));
      }
    });
  }

  openInviteDialog(project: Project) {
    this.store$.select(fromRoot.getProjectMembers(<string>project.id))
      .take(1)
      .map(member => member.map(m => ({id: m.username, name: m.name})))
      .debug('memberIds')
      .map(memberIds => this.dialog.open(InviteComponent, {data: { memberIds: memberIds}}))
      .switchMap(dialogRef => dialogRef.afterClosed().take(1).filter(n => n))
      .subscribe(val => {
        this.store$.dispatch(new actions.InviteMembersAction({projectId: <string>project.id, memberIds: <String[]>val}));
      });
  }

  openDeleteDialog(project: Project) {
    const confirm = {
      title: '删除项目：',
      content: '确认要删除该项目？',
      confirmAction: '确认删除'
    };
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {data: {dialog: confirm}});

    // 使用 take(1) 来自动销毁订阅，因为 take(1) 意味着接收到 1 个数据后就完成了
    dialogRef.afterClosed().take(1).subscribe(val => {
      if (val) {
        this.store$.dispatch(new actions.DeleteProjectAction(project));
      }
    });
  }

  private getThumbnailsObs(): Observable<string[]> {
    return Observable
      .range(0, 40)
      .map(i => `/assets/img/covers/${i}_tn.jpg`)
      .reduce((r, x) => {
        return [...r, x];
      }, []);
  }

  private buildImgSrc(img: string): string {
    return img.indexOf('_') > -1 ? img.split('_', 1)[0] + '.jpg' : img;
  }
}
